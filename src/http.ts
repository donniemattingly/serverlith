import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RequestMiddleware, ResponseMiddleware } from './router';

export const corsHeaders = {
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, Referer, User-Agent',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers:': '*',
    'Access-Control-Max-Age': 86400,
};

export const enableCORS: ResponseMiddleware = async <T> (responsePromise: ServerlithResponse<T> | Promise<ServerlithResponse<T>>) => {
    const response = await responsePromise;
    return Promise.resolve({
        ...response,
        headers: {
            ...response.headers,
            ...corsHeaders,
        },
    });
};

export const parseBody: RequestMiddleware = <T> (request: ServerlithRequest<T>): ServerlithRequest<T> => {
    return {
        ...request,
        body: typeof request.body === 'string' && request.body.length > 0 ? JSON.parse(request.body) : request.body,
    };
};

export interface ServerlithRequest<T> {
    httpMethod: string;
    body: T;
    queryParams: any;
    pathParams: any;
    path: string;
}


export interface ServerlithResponse<T> {
    statusCode: string;
    body: any;
    headers: {[name: string]: any};
}

export type SimpleRequest = ServerlithRequest<object | string>
export type SimpleResponse = ServerlithResponse<object | string>

const respondWith = () => new ResponseBuilder();

/*
 * In a perfect world, these could be composable functions,
 * but that's just asking for a confusing slew of nested parentheses
 * once/if the pipeline (|>) operator is accepted, this should change.
 */
class ResponseBuilder<T> {
    public response: ServerlithResponse<T> = {
        statusCode: '500',
        body: {},
        headers: {},
    };

    public status(statusCode: string) {
        this.response.statusCode = statusCode;
        return this;
    }

    public ok(): ResponseBuilder<T> {
        this.response.statusCode = '200';
        return this;
    }

    public created(): ResponseBuilder<T> {
        this.response.statusCode = '204';
        return this;
    }

    public fail(message: string): ResponseBuilder<T> {
        this.response.statusCode = '400';
        this.response.body = {message};
        return this;
    }

    public notFound(): ResponseBuilder<T> {
        this.response.statusCode = '404';
        this.response.body = {message: 'Not Found'};
        return this;
    }

    public header(key: string, value: string): ResponseBuilder<T> {
        this.response.headers[key] = value;
        return this;
    }

    public headers(headers: { [name: string]: any }): ResponseBuilder<T> {
        this.response.headers = {
            ...this.response.headers,
            ...headers,
        };

        return this;
    }

    public allowingCORS(): ResponseBuilder<T> {
        this.response.headers = {
            ...this.response.headers,
            ...corsHeaders,
        };

        return this;
    }

    public send(body: object) {
        this.response.body = body;
        return this.response;
    }

}

export const eventToRequest = <T> (event: APIGatewayEvent): ServerlithRequest<T> => {
    const {body, httpMethod, path, queryStringParameters} = event;
    return {
        body: JSON.parse(body || '') as T,
        httpMethod,
        queryParams: queryStringParameters,
        pathParams: null,
        path,
    };
};

export const responseToApiGatewayResult = async <T> (responsePromise: ServerlithResponse<T> | Promise<ServerlithResponse<T>>): Promise<APIGatewayProxyResult> => {
    const response = await responsePromise;
    return Promise.resolve({
        body: JSON.stringify(response.body),
        headers: response.headers,
        statusCode: parseInt(response.statusCode, 10),
    });
};

export const fail = (message: string, statusCode = '400'): SimpleResponse => {
    const responseBody = {
        message,
    };

    return respondWith()
        .status(statusCode)
        .send(responseBody);
};

export const notFound = fail('not found', '404');

export const success = (responseBody: object): SimpleResponse => {
    return respondWith()
        .ok()
        .send(responseBody);
};
