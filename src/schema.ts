import { z } from "@hono/zod-openapi";

export const createSessionParamsSchema = z.object({
  url: z.string(),
  interstitials: z
    .array(
      z.object({
        time: z.number(),
        duration: z.number().optional(),
        assets: z
          .array(
            z.discriminatedUnion("type", [
              z.object({
                type: z.literal("static"),
                url: z.string(),
              }),
              z.object({
                type: z.literal("vast"),
                url: z.string(),
              }),
            ]),
          )
          .optional(),
      }),
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
      TRACKING: z.any().optional(),
    }),
  ),
});
