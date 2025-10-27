import type { RouteConfig, RouteHandler, z } from "@hono/zod-openapi";
import type { DateTime } from "luxon";
import type {
  assetListPayloadSchema,
  assetListResponseSchema,
  createSessionParamsSchema,
  mediaPayloadSchema,
} from "./schema";

export type CreateSessionParams = z.infer<typeof createSessionParamsSchema>;

export type AssetListResponse = z.infer<typeof assetListResponseSchema>;

export type AssetListPayload = z.infer<typeof assetListPayloadSchema>;

export type MediaPayload = z.infer<typeof mediaPayloadSchema>;

export type Asset =
  | {
      type: "STATIC";
      url: string;
      duration: number;
    }
  | {
      type: "VAST";
      url: string;
    }
  | {
      type: "VASTDATA";
      data: string;
    };

export type Interstitial = {
  dateTime: DateTime;
  duration?: number;
  assets: Asset[];
};

export type Session = {
  id: string;
  startTime: DateTime;
  url: string;
  interstitials: Interstitial[];
  vmap?: string;
};

// biome-ignore lint/suspicious/noExplicitAny: Intended
export type IntendedAny = any;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R>;
