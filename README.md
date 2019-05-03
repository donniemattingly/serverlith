# Serverlith

*Serverless Monoliths*

Serverlith is a TypeScript library for writing REST APIs with AWS Lambda and API Gateway.
Serverlith handles conversion and routing of AWS API Gateway events received by your lambda 
function. 


## Examples

At the root, you're exporting a handler to give to AWS Lambda as with any function, and you
register your routes with the Serverlith router.

```typescript
export const handler = async (event: APIGatewayEvent) => {
    const routes = [
        ...routes,
    ];
    return await router(...routes)
        .handleEvent(event);
};
```
The `APIGatewayEvent` is transformed into a `Request` with the following interface:

```typescript
interface Request {
    httpMethod: string;
    body: any;
    queryParams: any;
    pathParams: any;
    path: string;
}
```

and handlers are expected to return `Response | Promise<Response>` with `Response` being:

```typescript
interface Response {
    statusCode: string;
    body: any;
    headers: {[name: string]: any};
}
```

You can use either decorator based or function based routing.


#### Decorator Based

You decorate a class with `@Handler` to enable routing for methods in the class, and use one of `@GET, @PUT, 
@POST, @DELETE, or @OPTIONS` to register that method as a handler for requests to that path.

Below we're registering `GET` requests to `/users/:id/` and `POST`s at `/users`

The methods you decorate should take an argument that extends `Request` and returns one that extends `Response`

```typescript
@Handler({path: '/users'})
export class UserHandler {

    @GET('/:id')
    public async getUser(request: Request): Promise<Response> {
        return fail('not implemented');
    }

    @POST('')
    public async createUser(request: CreateUserRequest): Promise<Response> {
        return fail('not implemented');
    }
}

```

#### Function Based

To accomplish the same as above with functional routing:

```typescript
const handler = handle('/users',
    GET('/:id', async (request: Request): Promise<Response> => {
        return fail('not implemented');
    }),
    POST('', async (request: Request): Promise<Response> => {
        return fail('not implemented');
    })
);
```