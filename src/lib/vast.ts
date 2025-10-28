import { DOMParser } from "@xmldom/xmldom";
import { VASTClient } from "extern/vast-client";
import type { VASTResponse } from "extern/vast-client";
import type { AppContext } from "../routes";
import type { svta2503 } from "../spec/svta2503";
import type { Asset } from "../types";
import { replaceUrlParams } from "../utils/url";

export type Ad = {
  id: string;
  url: string;
  duration: number;
  tracking: AdTracking;
};

export type AdTracking = {
  complete?: string[];
  error?: string[];
  firstQuartile?: string[];
  loaded?: string[];
  midpoint?: string[];
  mute?: string[];
  pause?: string[];
  collapse?: string[];
  expand?: string[];
  resume?: string[];
  skip?: string[];
  start?: string[];
  thirdQuartile?: string[];
  unmute?: string[];
  [key: string]: string[] | undefined;
};

export async function resolveVASTAsset(c: AppContext, asset: Asset) {
  const vastClient = new VASTClient();
  if (asset.type === "VAST") {
    const url = replaceUrlParams(asset.url);
    c.var.logger.info({ url }, "Requesting VAST");
    const vastResponse = await vastClient.get(url);
    c.var.logger.info(vastResponse, "Received VAST response");
    return mapAds(vastResponse);
  }
  if (asset.type === "VASTDATA") {
    const parser = new DOMParser();
    const xml = parser.parseFromString(asset.data, "text/xml");
    const vastResponse = await vastClient.parseVAST(xml);
    return mapAds(vastResponse);
  }
  return [];
}

function mapAds(response: VASTResponse) {
  const ads: Ad[] = [];
  for (const ad of response.ads) {
    const creative = ad.creatives.find(
      (creative) => creative.type === "linear",
    );
    if (!creative) {
      continue;
    }
    const mediaFile = creative.mediaFiles.find(
      (mediaFile) => mediaFile.mimeType === "application/x-mpegURL",
    );
    if (!mediaFile?.fileURL) {
      continue;
    }
    ads.push({
      id: ad.id,
      url: mediaFile.fileURL,
      duration: creative.duration,
      tracking: {
        // Tracking relative to the ad.
        error: ad.errorURLTemplates,
        impression: ad.impressionURLTemplates?.map((template) => template.url),
        // Tracking relative to the creative.
        ...creative.trackingEvents,
      },
    });
  }
  return ads;
}

export function createAdCreativeSignaling(
  ad: Ad,
  start: number,
): svta2503.BaseEnvelope {
  const tracking: svta2503.TrackingEvent[] = [];
  for (const type in ad.tracking) {
    const urls = ad.tracking[type];
    if (!urls || !urls.length) {
      continue;
    }
    if (
      type === "start" ||
      type === "firstQuartile" ||
      type === "midpoint" ||
      type === "thirdQuartile" ||
      type === "complete" ||
      type === "mute" ||
      type === "unmute" ||
      type === "pause" ||
      type === "resume" ||
      type === "error" ||
      type === "impression"
    ) {
      tracking.push({
        type,
        urls,
      });
    }
    if (type === "collapse") {
      tracking.push({
        type: "playerCollapse",
        urls,
      });
    }
    if (type === "expand") {
      tracking.push({
        type: "playerExpand",
        urls,
      });
    }
    // TODO: What to do with fullscreen and fullscreenExit?
  }
  return {
    version: 2,
    type: "slot",
    payload: [
      {
        type: "linear",
        start,
        duration: ad.duration,
        identifiers: [
          {
            scheme: "adId",
            value: ad.id,
          },
        ],
        tracking,
      },
    ],
  };
}
