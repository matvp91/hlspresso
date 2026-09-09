import { createRoute, z } from "@hono/zod-openapi";
import { errorResponseSchema } from "../../error";
import { createSessionParamsSchema } from "../../schema";

export const create = createRoute({
  method: "post",
  path: "/api/v1/sessions",
  operationId: "createSession",
  tags: ["Session"],
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
    400: {
      description: "The request is invalid",
      content: {
        "application/json": { schema: errorResponseSchema },
      },
    },
    502: {
      description:
        "A playlist or ad resource could not be fetched or processed",
      content: {
        "application/json": { schema: errorResponseSchema },
      },
    },
    503: {
      description: "The session store is unavailable",
      content: {
        "application/json": { schema: errorResponseSchema },
      },
    },
    500: {
      description: "An unexpected server error occurred",
      content: {
        "application/json": { schema: errorResponseSchema },
      },
    },
  },
});

export type CreateRoute = typeof create;
