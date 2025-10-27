import { createRoute, z } from "@hono/zod-openapi";
import { createSessionParamsSchema } from "../../schema";

export const create = createRoute({
  method: "post",
  path: "/api/v1/sessions",
  request: {
    body: {
      required: true,
      content: {
        "application/json": {
          schema: createSessionParamsSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: "Session created successfully",
      content: {
        "application/json": {
          schema: z.object({
            url: z.string(),
          }),
        },
      },
    },
  },
});

export type CreateRoute = typeof create;
