import { createAdCreativeSignaling } from "src/ad-signaling";
import type { AppRouteHandler } from "..";
import { processMainPlaylist, processMediaPlaylist } from "../..//lib/playlist";
import { getSession } from "../../lib/session";
import { resolveVASTAsset } from "../../lib/vast";
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

  const { sessionId, payload } = c.req.valid("param");
  const session = await getSession(bindings, sessionId);

  const text = await processMediaPlaylist({
    session,
    payload,
  });

  return c.text(text, 200, {
    "Content-Type": "application/vnd.apple.mpegurl",
  });
};

export const assetList: AppRouteHandler<AssetListRoute> = async (c) => {
  const bindings = await getBindings(c);

  const { sessionId, payload } = c.req.valid("param");
  const session = await getSession(bindings, sessionId);

  const data: AssetListResponse = {
    ASSETS: [],
  };

  const interstitial = session.interstitials.find((interstitial) =>
    interstitial.dateTime.equals(payload.dateTime),
  );
  if (interstitial) {
    let totalDuration = 0;
    for (const asset of interstitial.assets) {
      if (asset.type === "STATIC") {
        data.ASSETS.push({
          URI: asset.url,
          DURATION: asset.duration,
        });
        totalDuration += asset.duration;
      }
      if (asset.type === "VAST") {
        const ads = await resolveVASTAsset(asset);
        for (const ad of ads) {
          const adSignaling = createAdCreativeSignaling(ad, totalDuration);
          data.ASSETS.push({
            URI: ad.url,
            DURATION: ad.duration,
            "X-AD-CREATIVE-SIGNALING": adSignaling,
          });
          totalDuration += ad.duration;
        }
      }
    }
  }

  return c.json(data);
};
