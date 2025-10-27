import { OpenAPIHono } from "@hono/zod-openapi";
import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";

export function createRouter() {
  return new OpenAPIHono({
    defaultHook: (result) => {
      if (!result.success) {
        throw result.error;
      }
    },
  });
}

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R>;
