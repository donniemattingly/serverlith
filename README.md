# Serverlith

*Serverless Monoliths*

Serverlith is a TypeScript library for writing APIs with AWS Lambda and API Gateway more easily.
Serverlith handles conversion and routing of Amazon API Gateway events received by your lambda 
function. 

Serverlith operates based off the usage of [proxy resources](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-set-up-simple-proxy.html)
in Amazon API Gateway to route all possible methods and paths to the same Lambda function.

**Note:** Serverlith is a work in progress and is definitely *not* finished. Please don't use this right now, as
basically every aspect of the library can change.


## Examples

The entry point into a Serverlith app is a handler to give to AWS Lambda as with any function, and you
register your handlers with the Serverlith router.

```typescript
export const handler = async (event: APIGatewayEvent) => {
    return await router(...handlers)
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

## Routing

Choosing which routing style to use is mostly a personal preference - the decorators are just syntactic sugar
around the functional approach. Though the functional approach does enforce correct types, the class based approach
avoids issues caused by `this` being undefined in the handlers if not bound with `Function.prototype.bind`.

#### Decorator Based

You decorate a class with `@Handler` to enable routing for methods in the class, and use one of `@GET`, `@PUT`, 
`@POST`, `@DELETE`, or `@OPTIONS` to register that method as a handler for requests to that path.

Below we're registering `GET` requests to `/users/:id/` and `POST`s at `/users`

The methods you decorate should take an argument that extends `Request` and returns one that extends `Response`

```typescript
// note importing from serverlith/decorators
import {GET, Handler, POST,} from "serverlith/decorators"; 

@Handler({path: '/users'})
export class UserHandler {

    @GET('/:id')
    public getUser(request: Request): Response {
        return fail('not implemented');
    }

    @POST('')
    public async createUser(request: CreateUserRequest): Promise<Response> {
        const newUser = await service.createUser(request);
        return success(newUser);
    }
}

```

#### Function Based

To accomplish the same as above with functional routing:

```typescript
// importing from serverlith/functional here
import {GET, handle, POST} from 'serverlith/functional';

const handler = handle('/users',
    GET('/:id', async (request: Request): Promise<Response> => {
        return fail('not implemented');
    }),
    POST('', async (request: Request): Promise<Response> => {
        return fail('not implemented');
    })
);
```
