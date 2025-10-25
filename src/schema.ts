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
            z.object({
              url: z.string(),
            }),
          )
          .optional(),
      }),
    )
    .optional(),
});
