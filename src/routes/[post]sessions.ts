import { createRoute, z } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { createSession } from "../lib/session";
import { createSessionParamsSchema } from "../schema";
import { getBindings } from "../utils/bindings";

const route = createRoute({
  method: "post",
  path: "/sessions",
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

const handler: RouteHandler<typeof route> = async (c) => {
  const bindings = await getBindings(c);

  const params = c.req.valid("json");
  const session = await createSession(bindings, params);

  return c.json({
    url: `${bindings.env.BASE_URL}/out/${session.id}/main.m3u8`,
  });
};

export default { route, handler };
