import { createRoute, z } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { DateTime } from "luxon";
import rison from "rison";
import { getSession } from "../lib/session";
import type { IntendedAny } from "../types";
import { getBindings } from "../utils/bindings";

const route = createRoute({
  hide: true,
  method: "get",
  path: "/out/:payload/asset-list.json",
  request: {
    params: z.object({
      payload: z.string(),
    }),
    query: z.object({
      _HLS_primary_id: z.string().optional(),
      _HLS_start_offset: z.coerce.number().optional(),
    }),
  },
  responses: {
    200: {
      description: "The asset list",
      content: {
        "application/json": {
          schema: z.object({
            ASSETS: z.array(
              z.object({
                URI: z.string(),
                DURATION: z.number(),
              }),
            ),
          }),
        },
      },
    },
  },
});

const handler: RouteHandler<typeof route> = async (c) => {
  const { payload } = c.req.valid("param");

  const testPayload = rison.decode(payload) as IntendedAny;

  const bindings = await getBindings(c);
  const session = await getSession(bindings, testPayload.sessionId);

  const event = session.events.find((e) =>
    e.dateTime.equals(DateTime.fromISO(testPayload.dateTime)),
  );
  if (event?.assets) {
    return c.json({
      ASSETS: event.assets.map((asset) => ({
        URI: asset.url,
        DURATION: asset.duration,
      })),
    });
  }

  throw new Error("Failed");
};

export default { route, handler };
