import {APIGatewayEvent, APIGatewayProxyResult} from 'aws-lambda';
import * as _ from 'lodash';
import pathRegexp = require('path-to-regexp');
import {Key} from 'path-to-regexp';
import {corsHeaders, eventToRequest, fail, parseBody, ServerlithRequest, ServerlithResponse, responseToApiGatewayResult} from './http';
import {and} from "./functional";

export type Route = <T> (request: ServerlithRequest<T>, context: MatchContext) => RouterFunction;
export type RequestMiddleware =  <T> (request: ServerlithRequest<T>) => ServerlithRequest<T>;
export type ResponseMiddleware = <T> (response: ServerlithResponse<T> | Promise<ServerlithResponse<T>>) => Promise<ServerlithResponse<T>>;
export type HandlerFunction = <T> (request: ServerlithRequest<T>) => ServerlithResponse<T> | Promise<ServerlithResponse<T>>;

export interface MatchContext {
    methods: string [];
    path: string;
}

export interface MatchResult {
    matched: boolean;
    kv?: object;
}

export interface RouterFunction {
    handle: HandlerFunction;
    match: MatchContext;
}

export const baseContext = {
    methods: ['GET', 'POST', 'PUT', 'OPTIONS', 'DELETE'],
    path: '',
};
const defaultRequestMiddleware: RequestMiddleware[] = [parseBody];
const defaultResponseMiddleware: ResponseMiddleware[] = [];

export class Router {
    private verbose = false;
    private routes: Route[] = [];
    private requestMiddleware: RequestMiddleware[] = [...defaultRequestMiddleware];
    private responseMiddleware: ResponseMiddleware[] = [...defaultResponseMiddleware];

    public handleEvent(event: APIGatewayEvent): Promise<APIGatewayProxyResult> {
        if (this.verbose) {
            console.log(event);
        }
        return this.handleRequest(eventToRequest(event));
    }

    public handleRequest <T> (rawRequest: ServerlithRequest<T>): Promise<APIGatewayProxyResult> {
        const request = this.applyRequestMiddleware(rawRequest);
        const route = and(...this.routes)(request, baseContext);
        const matchResult = match(request, route.match);
        const requestWithPathParams = {
            ...request,
            pathParams: matchResult.kv,
        };
        const response = route.handle(requestWithPathParams);
        return responseToApiGatewayResult(this.applyResponseMiddleware(response));
    }

    public withLogging(): Router {
        this.verbose = true;
        return this;
    }

    public withHandlers(...handlers: HandlerClass[]) {
        const routes = _.flatMap(handlers, (h => h.routes));
        return this.withRoutes(...routes);
    }

    public withRoutes(...routes: Route[]) {
        this.routes = this.routes.concat(routes);
        return this;
    }

    public registerRequestMiddleware(...requestMiddleware: RequestMiddleware[]): Router {
        this.requestMiddleware.push(...requestMiddleware);
        return this;
    }

    public registerResponseMiddleware(...responseMiddleware: ResponseMiddleware[]): Router {
        this.responseMiddleware.push(...responseMiddleware);
        return this;
    }

    private applyRequestMiddleware <T> (request: ServerlithRequest<T>): ServerlithRequest<T> {
        return _.flow(this.requestMiddleware)(request);
    }

    private applyResponseMiddleware<T>(response: ServerlithResponse<T> | Promise<ServerlithResponse<T>>): ServerlithResponse<T> | Promise<ServerlithResponse<T>> {
        return _.flow(this.responseMiddleware)(response);
    }
}

interface HandlerClass {
    routes: Route[];
}

export const router = (...handlers: HandlerClass[]): Router => {
    return new Router().withHandlers(...handlers);
};

// these are modifications of functions from Express's routing
// (https://github.com/expressjs/express/blob/master/lib/router/layer.js)
export const match = <T> (request: ServerlithRequest<T>, c: MatchContext): MatchResult => {
    let matcher;
    const keys: Key[] = [];
    const regexp = pathRegexp(c.path, keys);

    if (request.path != null) {
        // match the path
        matcher = regexp.exec(request.path);
    }

    if (!matcher || !(c.methods.includes(request.httpMethod))) {
        return {
            matched: false,
        };
    }

    // store values
    const params: any = {};

    for (let i = 1; i < matcher.length; i++) {
        const key = keys[i - 1];
        const prop = key.name;
        const val = decodeParam(matcher[i]);

        if (val !== undefined || !(prop in params)) {
            params[prop] = val;
        }
    }

    return {
        kv: params,
        matched: true,
    };
};

const decodeParam = (val: any) => {
    if (typeof val !== 'string' || val.length === 0) {
        return val;
    }
    return decodeURIComponent(val);
};
