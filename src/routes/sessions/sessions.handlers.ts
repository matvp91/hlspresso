import type { AppRouteHandler } from "..";
import { createSession } from "../../lib/session";
import { getBindings } from "../../utils/bindings";
import type { CreateRoute } from "./sessions.routes";

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const bindings = await getBindings(c);

  const params = c.req.valid("json");
  const session = await createSession(bindings, params);

  return c.json({
    url: `${bindings.env.BASE_URL}/out/${session.id}/main.m3u8`,
  });
};
