import type { RouteConfig, RouteHandler, z } from "@hono/zod-openapi";
import type { VastTrackingEvents } from "extern/vast-client";
import type { DateTime } from "luxon";
import type {
  assetListResponseSchema,
  createSessionParamsSchema,
} from "./schema";

export type CreateSessionParams = z.infer<typeof createSessionParamsSchema>;

export type AssetListResponse = z.infer<typeof assetListResponseSchema>;

export type AssetTracking = {
  impression?: string[];
};

export type Asset = {
  dateTime: DateTime;
  tracking?: VastTrackingEvents;
} & (
  | {
      type: "URL";
      url: string;
      duration: number;
    }
  | {
      type: "VAST";
      adTagUri?: string;
      vastAdData?: string;
    }
);

export type Session = {
  id: string;
  startTime: DateTime;
  url: string;
  assets: Asset[];
  vmap?: string;
};

export type ValueOf<T> = T[keyof T];

// biome-ignore lint/suspicious/noExplicitAny: Intended
export type IntendedAny = any;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R>;
