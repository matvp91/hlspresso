import { z } from "@hono/zod-openapi";

export const createSessionParamsSchema = z.object({
  url: z.string(),
  assets: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("URL"),
          time: z.number(),
          url: z.string(),
          duration: z.number().optional(),
        }),
        z.object({
          type: z.literal("VAST"),
          time: z.number(),
          url: z.string(),
        }),
        z.object({
          type: z.literal("VASTDATA"),
          time: z.number(),
          data: z.string(),
        }),
      ]),
    )
    .optional(),
  vmap: z
    .object({
      url: z.string(),
    })
    .optional(),
});

export const assetListResponseSchema = z.object({
  ASSETS: z.array(
    z.object({
      URI: z.string(),
      DURATION: z.number(),
    }),
  ),
});
