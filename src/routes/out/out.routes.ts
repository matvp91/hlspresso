import { createRoute, z } from "@hono/zod-openapi";
import {
  assetListPayloadSchema,
  assetListResponseSchema,
  mediaPayloadSchema,
} from "../../schema";

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
  path: "/out/:sessionId/media/:payload/*",
  request: {
    params: z.object({
      sessionId: z.uuid(),
      payload: mediaPayloadSchema,
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

export const assetList = createRoute({
  hide: true,
  method: "get",
  path: "/out/:sessionId/:payload/asset-list.json",
  request: {
    params: z.object({
      sessionId: z.string(),
      payload: assetListPayloadSchema,
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

export type MainRoute = typeof main;

export type MediaRoute = typeof media;

export type AssetListRoute = typeof assetList;
