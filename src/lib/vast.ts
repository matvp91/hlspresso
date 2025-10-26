import { VASTClient } from "extern/vast-client";
import type { VastCreativeLinear } from "extern/vast-client";
import type { Asset } from "../types";
import { replaceUrlParams } from "../utils/url";

export async function resolveFromVASTAsset(
  vastAsset: Extract<Asset, { type: "VAST" }>,
) {
  const assets: Extract<Asset, { type: "URL" }>[] = [];

  if (vastAsset.adTagUri) {
    const vastClient = new VASTClient();
    const vastResponse = await vastClient.get(
      replaceUrlParams(vastAsset.adTagUri),
    );
    for (const ad of vastResponse.ads) {
      const creative = ad.creatives.find(
        (creative) => creative.type === "linear",
      ) as VastCreativeLinear | undefined;
      if (!creative) {
        continue;
      }
      const mediaFile = creative.mediaFiles.find(
        (mediaFile) => mediaFile.mimeType === "application/x-mpegURL",
      );
      if (!mediaFile?.fileURL) {
        continue;
      }
      assets.push({
        type: "URL",
        dateTime: vastAsset.dateTime,
        url: mediaFile.fileURL,
        duration: creative.duration,
      });
    }
  }

  return assets;
}
