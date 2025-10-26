import { VASTClient } from "extern/vast-client";
import type { VastCreativeLinear } from "extern/vast-client";
import type { Asset } from "../types";

export async function resolveAssets(assets: Asset[]) {
  const result: Extract<Asset, { type: "URL" }>[] = [];

  for (const asset of assets) {
    if (asset.type === "URL") {
      result.push(asset);
    }
    if (asset.type === "VAST") {
      const resolvedAssets = await resolveVASTAsset(asset);
      result.push(...resolvedAssets);
    }
  }

  return result;
}

async function resolveVASTAsset(asset: Extract<Asset, { type: "VAST" }>) {
  const result: Extract<Asset, { type: "URL" }>[] = [];

  if (asset.adTagUri) {
    const vastClient = new VASTClient();
    const vastResponse = await vastClient.get(asset.adTagUri);

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

      result.push({
        type: "URL",
        dateTime: asset.dateTime,
        url: mediaFile.fileURL,
        duration: creative.duration,
      });
    }
  }

  return result;
}
