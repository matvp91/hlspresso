import { processMainPlaylist, processMediaPlaylist } from "../..//lib/playlist";
import { getSession } from "../../lib/session";
import { resolveFromVASTAsset } from "../../lib/vast";
import type { AppRouteHandler } from "../../types";
import type { AssetListResponse } from "../../types";
import { getBindings } from "../../utils/bindings";
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

  const { sig } = c.req.valid("query");

  const text = await processMediaPlaylist({
    session,
    sig,
  });

  return c.text(text, 200, {
    "Content-Type": "application/vnd.apple.mpegurl",
  });
};

export const assetList: AppRouteHandler<AssetListRoute> = async (c) => {
  const bindings = await getBindings(c);

  const { sessionId } = c.req.valid("param");
  const session = await getSession(bindings, sessionId);

  const { sig } = c.req.valid("query");

  const data: AssetListResponse = {
    ASSETS: [],
  };

  const interstitial = session.interstitials.find((interstitial) =>
    interstitial.dateTime.equals(sig.dateTime),
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
