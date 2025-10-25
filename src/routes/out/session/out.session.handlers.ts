import { ApiError, ApiErrorCode } from "../../../error";
import { parseMediaPayload } from "../../../lib/payload";
import {
  processMainPlaylist,
  processMediaPlaylist,
} from "../../../lib/playlist";
import { getSession } from "../../../lib/session";
import type { AppRouteHandler } from "../../../types";
import { getBindings } from "../../../utils/bindings";
import { resolveUrl } from "../../../utils/url";
import type { MainRoute, MediaRoute } from "./out.session.routes";

export const main: AppRouteHandler<MainRoute> = async (c) => {
  const bindings = await getBindings(c);

  const { sessionId } = c.req.valid("param");
  const session = await getSession(bindings, sessionId);

  const url = session.mainUrl;
  const text = await processMainPlaylist({
    bindings,
    session,
    url,
  });

  return c.text(text, 200, {
    "Content-Type": "application/vnd.apple.mpegurl",
  });
};

export const media: AppRouteHandler<MediaRoute> = async (c) => {
  const bindings = await getBindings(c);

  const { sessionId } = c.req.valid("param");
  const session = await getSession(bindings, sessionId);

  const payloadString = c.req.path.match(/media\/(\([^)]+\))/)?.[1];
  if (!payloadString) {
    throw new ApiError(ApiErrorCode.INVALID_PAYLOAD);
  }

  const payload = parseMediaPayload(bindings, payloadString);

  const url = resolveUrl({
    baseUrl: session.mainUrl,
    path: payload.path,
  });

  const text = await processMediaPlaylist({
    bindings,
    session,
    payload,
    url,
  });

  return c.text(text, 200, {
    "Content-Type": "application/vnd.apple.mpegurl",
  });
};
