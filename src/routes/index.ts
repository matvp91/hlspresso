import { OpenAPIHono } from "@hono/zod-openapi";

export function createRouter() {
  return new OpenAPIHono({
    defaultHook: (result) => {
      if (!result.success) {
        throw result.error;
      }
    },
  });
}
