import { createRoute, z } from "@hono/zod-openapi";
import { assetListResponseSchema } from "../../schema";

export const assetList = createRoute({
  hide: true,
  method: "get",
  path: "/out/:sessionId/interstitial/*",
  request: {
    params: z.object({
      sessionId: z.string(),
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
          schema: assetListResponseSchema,
        },
      },
    },
  },
});

export type AssetListRoute = typeof assetList;
