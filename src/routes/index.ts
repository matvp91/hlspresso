import type { KVNamespace } from "@cloudflare/workers-types";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { PinoLogger } from "hono-pino";
import type { AppKv, AppParams } from "./middleware";

export type AppEnv = {
  Variables: {
    params: AppParams;
    kv: AppKv;
    logger: PinoLogger;
  };
  Bindings: {
    hlspresso?: KVNamespace;
  };
};

export function createRouter() {
  return new OpenAPIHono<AppEnv>({
    defaultHook: (result) => {
      if (!result.success) {
        throw result.error;
      }
    },
  });
}

export type AppContext = Context<AppEnv>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppEnv>;
