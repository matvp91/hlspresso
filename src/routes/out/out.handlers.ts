import { DateTime } from "luxon";
import rison from "rison";
import { assert } from "../../assert";
import { getSession } from "../../lib/session";
import type { AppRouteHandler, IntendedAny } from "../../types";
import { getBindings } from "../../utils/bindings";
import type { AssetListRoute } from "./out.routes";

export const assetList: AppRouteHandler<AssetListRoute> = async (c) => {
  const { payload } = c.req.valid("param");

  const testPayload = rison.decode(payload) as IntendedAny;

  const bindings = await getBindings(c);
  const session = await getSession(bindings, testPayload.sessionId);

  const event = session.events.find((e) =>
    e.dateTime.equals(DateTime.fromISO(testPayload.dateTime)),
  );
  assert(event?.assets);

  return c.json({
    ASSETS: event.assets.map((asset) => ({
      URI: asset.url,
      DURATION: asset.duration,
    })),
  });
};
