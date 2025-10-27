import type { z } from "@hono/zod-openapi";
import type {
  assetListPayloadSchema,
  assetListResponseSchema,
  assetSchema,
  createSessionParamsSchema,
  filterSchema,
  interstitialSchema,
  mediaPayloadSchema,
  sessionSchema,
} from "./schema";

export type CreateSessionParams = z.infer<typeof createSessionParamsSchema>;

export type AssetListResponse = z.infer<typeof assetListResponseSchema>;

export type AssetListPayload = z.infer<typeof assetListPayloadSchema>;

export type MediaPayload = z.infer<typeof mediaPayloadSchema>;

export type Session = z.infer<typeof sessionSchema>;

export type Interstitial = z.infer<typeof interstitialSchema>;

export type Asset = z.infer<typeof assetSchema>;

export type Filter = z.infer<typeof filterSchema>;

// biome-ignore lint/suspicious/noExplicitAny: Intended
export type IntendedAny = any;
