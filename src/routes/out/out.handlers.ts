import { processMainPlaylist, processMediaPlaylist } from "../..//lib/playlist";
import { parseAssetListPayload, parseMediaPayload } from "../../lib/payload";
import { getSession } from "../../lib/session";
import { resolveFromVASTAsset } from "../../lib/vast";
import type { AppRouteHandler } from "../../types";
import type { AssetListResponse } from "../../types";
import { getBindings } from "../../utils/bindings";
import { resolveUrl } from "../../utils/url";
import type { AssetListRoute, MainRoute, MediaRoute } from "./out.routes";

export const main: AppRouteHandler<MainRoute> = async (c) => {
  const bindings = await getBindings(c);

  const { sessionId } = c.req.valid("param");
  const session = await getSession(bindings, sessionId);

  const text = await processMainPlaylist({
    bindings,
    session,
  });

  return c.text(text, 200, {
    "Content-Type": "application/vnd.apple.mpegurl",
  });
};

export const media: AppRouteHandler<MediaRoute> = async (c) => {
  const bindings = await getBindings(c);

  const { sessionId } = c.req.valid("param");
  const session = await getSession(bindings, sessionId);

  const payload = parseMediaPayload(bindings, c.req.path);

  const origUrl = resolveUrl({
    baseUrl: session.url,
    path: payload.path,
  });

  const text = await processMediaPlaylist({
    bindings,
    session,
    payload,
    origUrl,
  });

  return c.text(text, 200, {
    "Content-Type": "application/vnd.apple.mpegurl",
  });
};

export const assetList: AppRouteHandler<AssetListRoute> = async (c) => {
  const bindings = await getBindings(c);

  const { sessionId } = c.req.valid("param");
  const session = await getSession(bindings, sessionId);

  const payload = parseAssetListPayload(c.req.path);

  const data: AssetListResponse = {
    ASSETS: [],
  };

  const interstitial = session.interstitials.find((interstitial) =>
    interstitial.dateTime.equals(payload.dateTime),
  );
  if (interstitial) {
    for (const asset of interstitial.assets) {
      if (asset.type === "STATIC") {
        data.ASSETS.push({
          URI: asset.url,
          DURATION: asset.duration,
        });
      }
      if (asset.type === "VAST") {
        const vastAssets = await resolveFromVASTAsset(asset);
        for (const vastAsset of vastAssets) {
          data.ASSETS.push({
            URI: vastAsset.url,
            DURATION: vastAsset.duration,
          });
        }
      }
    }
  }

  return c.json(data);
};
