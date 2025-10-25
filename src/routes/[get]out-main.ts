import { createRoute, z } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { getMainPlaylist } from "../lib/playlist";
import { getSession } from "../lib/session";
import { rewriteUrls } from "../lib/transform-main";
import { stringifyMainPlaylist } from "../parser";
import { getBindings } from "../utils/bindings";

const route = createRoute({
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

const handler: RouteHandler<typeof route> = async (c) => {
  const bindings = await getBindings(c);

  const { sessionId } = c.req.valid("param");
  const session = await getSession(bindings, sessionId);

  const playlist = await getMainPlaylist(session.mainUrl);

  // Each media URL shall point to our proxy too.
  rewriteUrls(bindings, playlist);

  const nextPlaylistText = stringifyMainPlaylist(playlist);

  return c.text(nextPlaylistText, 200, {
    "Content-Type": "application/vnd.apple.mpegurl",
  });
};

export default { route, handler };
