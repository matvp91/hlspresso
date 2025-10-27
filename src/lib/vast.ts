import { VASTClient } from "extern/vast-client";
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

export async function resolveVASTAsset(
  vastAsset: Extract<Asset, { type: "VAST" }>,
) {
  const ads: Ad[] = [];
  if (vastAsset.url) {
    const vastClient = new VASTClient();
    const vastResponse = await vastClient.get(replaceUrlParams(vastAsset.url));
    for (const ad of vastResponse.ads) {
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
          impression: ad.impressionURLTemplates?.map(
            (template) => template.url,
          ),
          // Tracking relative to the creative.
          ...creative.trackingEvents,
        },
      });
    }
  }
  return ads;
}
