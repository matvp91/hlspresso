import { createRoute, z } from "@hono/zod-openapi";

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

export type MainRoute = typeof main;

export type MediaRoute = typeof media;
