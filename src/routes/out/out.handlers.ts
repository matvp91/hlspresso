import { parseAssetListPayload } from "../../lib/payload";
import { getSession } from "../../lib/session";
import { resolveFromVASTAsset } from "../../lib/vast";
import type { AppRouteHandler } from "../../types";
import type { AssetListResponse } from "../../types";
import { getBindings } from "../../utils/bindings";
import type { AssetListRoute } from "./out.routes";

export const assetList: AppRouteHandler<AssetListRoute> = async (c) => {
  const bindings = await getBindings(c);

  const { payload } = c.req.valid("param");
  const assetListPayload = parseAssetListPayload(payload);

  const session = await getSession(bindings, assetListPayload.sessionId);

  const data: AssetListResponse = {
    ASSETS: [],
  };

  const assets = session.assets.filter((asset) =>
    asset.dateTime.equals(assetListPayload.dateTime),
  );

  for (const asset of assets) {
    if (asset.type === "URL") {
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

  return c.json(data);
};
