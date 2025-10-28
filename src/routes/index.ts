import { OpenAPIHono } from "@hono/zod-openapi";
import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { PinoLogger } from "hono-pino";

export function createRouter() {
  return new OpenAPIHono<{
    Variables: {
      logger: PinoLogger;
    };
  }>({
    defaultHook: (result) => {
      if (!result.success) {
        throw result.error;
      }
    },
  });
}

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R>;
