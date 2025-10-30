import type { AppRouteHandler } from "..";
import { processMainPlaylist, processMediaPlaylist } from "../..//lib/playlist";
import { getSession } from "../../lib/session";
import { createAdCreativeSignaling, resolveVASTAsset } from "../../lib/vast";
import type { AssetListResponse } from "../../types";
import type { AssetListRoute, MainRoute, MediaRoute } from "./out.routes";

export const main: AppRouteHandler<MainRoute> = async (c) => {
  const { sessionId } = c.req.valid("param");
  const session = await getSession(c, sessionId);

  const text = await processMainPlaylist(c, {
    session,
  });

  return c.text(text, 200, {
    "Content-Type": "application/vnd.apple.mpegurl",
  });
};

export const media: AppRouteHandler<MediaRoute> = async (c) => {
  const { sessionId, payload } = c.req.valid("param");
  const session = await getSession(c, sessionId);

  const text = await processMediaPlaylist({
    session,
    payload,
  });

  return c.text(text, 200, {
    "Content-Type": "application/vnd.apple.mpegurl",
  });
};

export const assetList: AppRouteHandler<AssetListRoute> = async (c) => {
  const { sessionId, payload } = c.req.valid("param");
  const session = await getSession(c, sessionId);

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
      if (asset.type === "VAST" || asset.type === "VASTDATA") {
        const ads = await resolveVASTAsset(c, asset);
        c.var.logger.info(ads, "Resolved ads");
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

  if (session.vast) {
    const ads = await resolveVASTAsset(c, {
      type: "VAST",
      url: session.vast.url,
    });
    for (const ad of ads) {
      data.ASSETS.push({
        URI: ad.url,
        DURATION: ad.duration,
      });
    }
  }

  return c.json(data);
};
