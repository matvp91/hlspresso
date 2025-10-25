import crypto from "node:crypto";
import { DateTime } from "luxon";
import { ApiError, ApiErrorCode } from "../error";
import type { CreateSessionParams, Session } from "../types";
import type { Bindings } from "../utils/bindings";
import { SuperJSON } from "../utils/json";
import { getDuration } from "./playlist";

export async function createSession(
  bindings: Bindings,
  params: CreateSessionParams,
) {
  const id = crypto.randomUUID();
  const startTime = DateTime.now();

  const session: Session = {
    id,
    startTime,
    url: params.url,
    assets: [],
    vmap: params.vmap?.url,
  };

  if (params.assets) {
    for (const asset of params.assets) {
      const dateTime = toDateTime(session.startTime, asset.time);
      if (asset.type === "URL") {
        session.assets.push({
          type: "URL",
          dateTime,
          url: asset.url,
          duration: await getDuration(asset.url),
        });
      }
      if (asset.type === "VAST") {
        session.assets.push({
          type: "VAST",
          dateTime,
          url: asset.url,
        });
      }
    }
  }

  const json = SuperJSON.stringify(session);
  await bindings.kv.set(`session:${id}`, json);

  return session;
}

export async function getSession(bindings: Bindings, id: string) {
  const data = await bindings.kv.get(`session:${id}`);
  if (!data) {
    throw new ApiError(ApiErrorCode.SESSION_NOT_FOUND);
  }
  return SuperJSON.parse<Session>(data);
}

export async function updateSession(bindings: Bindings, session: Session) {
  const { id } = session;
  const value = SuperJSON.stringify(session);
  await bindings.kv.set(`session:${id}`, value);
}

export function toDateTime(startTime: DateTime, time: string | number) {
  return typeof time === "string"
    ? DateTime.fromISO(time)
    : startTime.plus({ seconds: time });
}
