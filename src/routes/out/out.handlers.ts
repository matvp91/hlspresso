import { parseAssetListPayload } from "../../lib/payload";
import { getSession } from "../../lib/session";
import type { AppRouteHandler, IntendedAny } from "../../types";
import { getBindings } from "../../utils/bindings";
import type { AssetListRoute } from "./out.routes";

export const assetList: AppRouteHandler<AssetListRoute> = async (c) => {
  const bindings = await getBindings(c);

  const { payload } = c.req.valid("param");
  const assetListPayload = parseAssetListPayload(payload);

  const session = await getSession(bindings, assetListPayload.sessionId);

  const ASSETS: IntendedAny[] = [];

  for (const asset of session.assets) {
    if (!asset.dateTime.equals(assetListPayload.dateTime)) {
      // The asset is not for this list.
      continue;
    }
    if (asset.type === "URL") {
      ASSETS.push({
        URI: asset.url,
        DURATION: asset.duration,
      });
    }
  }

  return c.json({
    ASSETS,
  });
};
