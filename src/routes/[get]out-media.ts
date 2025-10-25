import { createRoute, z } from "@hono/zod-openapi";
import type { RouteHandler } from "@hono/zod-openapi";
import { ApiError, ApiErrorCode } from "../error";
import { parseMediaPayload } from "../lib/payload";
import { getMediaPlaylist } from "../lib/playlist";
import { getSession } from "../lib/session";
import {
  addStaticDateRanges,
  ensureProgramDateTime,
  rewriteUrls,
} from "../lib/transform-media";
import { stringifyMediaPlaylist } from "../parser";
import { getBindings } from "../utils/bindings";
import { resolveUrl } from "../utils/url";

const route = createRoute({
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

const handler: RouteHandler<typeof route> = async (c) => {
  const bindings = await getBindings(c);

  const { sessionId } = c.req.valid("param");
  const session = await getSession(bindings, sessionId);

  const payloadString = c.req.path.match(/media\/(\([^)]+\))/)?.[1];
  if (!payloadString) {
    throw new ApiError(ApiErrorCode.INVALID_PAYLOAD);
  }

  const payload = parseMediaPayload(bindings, payloadString);

  const url = resolveUrl(session.mainUrl, payload.path);
  const playlist = await getMediaPlaylist(url);

  ensureProgramDateTime(session, playlist);
  rewriteUrls(playlist, url);

  if (payload.type === "video") {
    addStaticDateRanges(playlist, session);
  }

  const newPlaylistText = stringifyMediaPlaylist(playlist);

  return c.text(newPlaylistText, 200, {
    "Content-Type": "application/vnd.apple.mpegurl",
  });
};

export default { route, handler };
