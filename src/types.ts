import type { RouteConfig, RouteHandler, z } from "@hono/zod-openapi";
import type {
  assetListPayloadSchema,
  assetListResponseSchema,
  assetSchema,
  createSessionParamsSchema,
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

// biome-ignore lint/suspicious/noExplicitAny: Intended
export type IntendedAny = any;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R>;
