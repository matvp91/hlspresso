import { createRoute, z } from "@hono/zod-openapi";
import { createSessionParamsSchema } from "../../schema";

export const create = createRoute({
  method: "post",
  path: "/api/v1/sessions",
  operationId: "createSession",
  tags: ["session"],
  summary: "Create a session",
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
            id: z.string().openapi({
              description: "Session id.",
            }),
            url: z.string().openapi({
              description: "The proxied URL to the main playlist.",
            }),
          }),
        },
      },
    },
  },
});

export type CreateRoute = typeof create;
