import { APIGatewayEvent, APIGatewayProxyResult } from 'aws-lambda';
import { RequestMiddleware, ResponseMiddleware } from './router';

export const corsHeaders = {
    'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, Referer, User-Agent',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers:': '*',
    'Access-Control-Max-Age': 86400,
};

export const enableCORS: ResponseMiddleware = async (responsePromise: ServerlithResponse | Promise<ServerlithResponse>) => {
    const response = await responsePromise;
    return Promise.resolve({
        ...response,
        headers: {
            ...response.headers,
            ...corsHeaders,
        },
    });
};

export const parseBody: RequestMiddleware = (request: ServerlithRequest): ServerlithRequest => {
    return {
        ...request,
        body: typeof request.body === 'string' ? JSON.parse(request.body) : request.body,
    };
};

export interface ServerlithRequest {
    httpMethod: string;
    body: any;
    queryParams: any;
    pathParams: any;
    path: string;
}

export const dummyRequest: ServerlithRequest = {
    httpMethod: 'GET',
    queryParams: null,
    pathParams: null,
    body: {},
    path: '/'
};

export interface ServerlithResponse {
    statusCode: string;
    body: any;
    headers: {[name: string]: any};
}

const respondWith = () => new ResponseBuilder();

/*
 * In a perfect world, these could be composable functions,
 * but that's just asking for a confusing slew of nested parentheses
 * once/if the pipeline (|>) operator is accepted, this should change.
 */
class ResponseBuilder {
    public response: ServerlithResponse = {
        statusCode: '500',
        body: {},
        headers: {},
    };

    public status(statusCode: string) {
        this.response.statusCode = statusCode;
        return this;
    }

    public ok(): ResponseBuilder {
        this.response.statusCode = '200';
        return this;
    }

    public created(): ResponseBuilder {
        this.response.statusCode = '204';
        return this;
    }

    public fail(message: string): ResponseBuilder {
        this.response.statusCode = '400';
        this.response.body = {message};
        return this;
    }

    public notFound(): ResponseBuilder {
        this.response.statusCode = '404';
        this.response.body = {message: 'Not Found'};
        return this;
    }

    public header(key: string, value: string): ResponseBuilder {
        this.response.headers[key] = value;
        return this;
    }

    public headers(headers: { [name: string]: any }): ResponseBuilder {
        this.response.headers = {
            ...this.response.headers,
            ...headers,
        };

        return this;
    }

    public allowingCORS(): ResponseBuilder {
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

export const eventToRequest = (event: APIGatewayEvent): ServerlithRequest => {
    const {body, httpMethod, path, queryStringParameters} = event;
    return {
        body,
        httpMethod,
        queryParams: queryStringParameters,
        pathParams: null,
        path,
    };
};

export const responseToApiGatewayResult = async (responsePromise: ServerlithResponse | Promise<ServerlithResponse>): Promise<APIGatewayProxyResult> => {
    const response = await responsePromise;
    return Promise.resolve({
        body: JSON.stringify(response.body),
        headers: response.headers,
        statusCode: parseInt(response.statusCode, 10),
    });
};

export const fail = (message: string, statusCode = '400'): ServerlithResponse => {
    const responseBody = {
        message,
    };

    return respondWith()
        .status(statusCode)
        .send(responseBody);
};

export const notFound = fail('not found', '404');

export const success = (responseBody: object): ServerlithResponse => {
    return respondWith()
        .ok()
        .send(responseBody);
};
