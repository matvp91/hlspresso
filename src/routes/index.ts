import type { KVNamespace } from "@cloudflare/workers-types";
import type { RouteConfig, RouteHandler } from "@hono/zod-openapi";
import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import type { PinoLogger } from "hono-pino";
import type { EnvParams } from "../env";
import { fromRequestValidationError } from "../error";
import type { AppKv } from "./middleware";

export type AppEnv = {
  Variables: {
    params: EnvParams;
    kv: AppKv;
    logger: PinoLogger;
    requestId: string;
  };
  Bindings: {
    hlspresso?: KVNamespace;
  };
};

export function createRouter() {
  return new OpenAPIHono<AppEnv>({
    defaultHook: (result) => {
      if (!result.success) {
        throw fromRequestValidationError(result.error, result.target);
      }
    },
  });
}

export type AppContext = Context<AppEnv>;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R, AppEnv>;
