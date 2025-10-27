import { VASTClient } from "extern/vast-client";
import type { VastAd, VastCreativeLinear } from "extern/vast-client";
import type { SignalingEventType } from "../ad-signaling";
import type { Asset } from "../types";
import { replaceUrlParams } from "../utils/url";

export type Ad = {
  id: string;
  url: string;
  duration: number;
  tracking: Partial<Record<SignalingEventType, string[]>>;
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
      ) as VastCreativeLinear | undefined;
      if (!creative?.adId) {
        continue;
      }
      const mediaFile = creative.mediaFiles.find(
        (mediaFile) => mediaFile.mimeType === "application/x-mpegURL",
      );
      if (!mediaFile?.fileURL) {
        continue;
      }
      ads.push({
        id: creative.adId,
        url: mediaFile.fileURL,
        duration: creative.duration,
        tracking: mapTrackingEvents(ad, creative),
      });
    }
  }

  return ads;
}

function mapTrackingEvents(ad: VastAd, creative: VastCreativeLinear) {
  const e = creative.trackingEvents;
  const result: Partial<Record<SignalingEventType, string[]>> = {
    impression: ad.impressionURLTemplates.map((template) => template.url),
    clickTracking: e.tracking ?? [],
    complete: e.complete ?? [],
    error: e.error ?? [],
    firstQuartile: e.firstQuartile ?? [],
    loaded: e.loaded ?? [],
    midpoint: e.midpoint ?? [],
    mute: e.mute ?? [],
    pause: e.pause ?? [],
    playerCollapse: e.collapse ?? [],
    playerExpand: e.expand ?? [],
    resume: e.resume ?? [],
    skip: e.skip ?? [],
    start: e.start ?? [],
    thirdQuartile: e.thirdQuartile ?? [],
    unmute: e.unmute ?? [],
  };
  return result;
}
