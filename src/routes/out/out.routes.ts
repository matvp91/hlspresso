import { createRoute, z } from "@hono/zod-openapi";
import { assetListResponseSchema } from "../../schema";

export const main = createRoute({
  hide: true,
  method: "get",
  path: "/out/:sessionId/main.m3u8",
  request: {
    params: z.object({
      sessionId: z.uuid(),
    }),
  },
  responses: {
    200: {
      description: "The main playlist",
      content: {
        "application/vnd.apple.mpegurl": {
          schema: z.string(),
        },
      },
    },
  },
});

export const media = createRoute({
  hide: true,
  method: "get",
  path: "/out/:sessionId/media/*",
  request: {
    params: z.object({
      sessionId: z.uuid(),
    }),
  },
  responses: {
    200: {
      description: "The media playlist",
      content: {
        "application/vnd.apple.mpegurl": {
          schema: z.string(),
        },
      },
    },
  },
});

export const interstitial = createRoute({
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

export type InterstitialRoute = typeof interstitial;

export type MainRoute = typeof main;

export type MediaRoute = typeof media;
