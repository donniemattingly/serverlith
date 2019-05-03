import 'reflect-metadata';
import {HandlerFunction, Route} from './base';
import {handle, routeMethod} from './functional';


const metadataKey = Symbol('serverlith-metadata');

interface RouteDecoratorConfig {
    path: string;
    method: string;
    handlerName: string | symbol;
}

const routeMethodDecoratorFactory = (path: string, method: string): MethodDecorator => {
    return (target: object, handlerName: string | symbol): void => {
        let handlers: RouteDecoratorConfig[] = Reflect.getMetadata(metadataKey, target);
        const config = {
            handlerName,
            method,
            path,
        };

        if (handlers) {
            handlers.push(config);
        } else {
            handlers = [config];
            Reflect.defineMetadata(metadataKey, handlers, target);
        }
    };
};

export const GET = (path: string): MethodDecorator => routeMethodDecoratorFactory(path, 'GET');
export const PUT = (path: string): MethodDecorator => routeMethodDecoratorFactory(path, 'PUT');
export const POST = (path: string): MethodDecorator => routeMethodDecoratorFactory(path, 'POST');
export const DELETE = (path: string): MethodDecorator => routeMethodDecoratorFactory(path, 'DELETE');
export const OPTIONS = (path: string): MethodDecorator => routeMethodDecoratorFactory(path, 'OPTIONS');

function getDecoratedRoutes(origin: any): Route[] {
    const properties: RouteDecoratorConfig[] = Reflect.getMetadata(metadataKey, origin)
        .filter((c: any) => !!c);
    const result: Route[] = [];
    properties.forEach((config) => {
        const handler: HandlerFunction = origin[config.handlerName].bind(origin);
        result.push(routeMethod(config.method, config.path, handler));
    });
    return result;
}

interface HandlerParams {
    path: string;
}

export const Noop = <TFunction extends Function>(target: TFunction) => {
    return target;
};

export const Handler = (params?: HandlerParams): ClassDecorator => {
    return classDecoratorFactory(params || {path: ''})
};

const classDecoratorFactory = (params: HandlerParams) => {
    return <TFunction extends Function>(target: TFunction) => {
        // save a reference to the original constructor
        const original: any = target;

        // a utility function to generate instances of a class
        function construct(ctor: Function, args: any[]) {
            const c: any = function () {
                // @ts-ignore
                return ctor.apply(this, args);
            };
            c.prototype = ctor.prototype;
            return new c();
        }

        // the new constructor behaviour
        const f: any = (...args: any[]) => {
            const result = construct(original, args);
            const routes = getDecoratedRoutes(result);
            result.routes = [handle(params.path, ...routes)];
            return result;
        };

        // copy prototype so intanceof operator still works
        f.prototype = original.prototype;

        // return new constructor (will override original)
        return f;
    };
};


export * from './base';