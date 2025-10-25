import crypto from "node:crypto";
import { DateTime } from "luxon";
import { ApiError, ApiErrorCode } from "../error";
import type { CreateSessionParams, Session, TimedEvent } from "../types";
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
    mainUrl: params.url,
    events: [],
  };

  if (params.interstitials) {
    for (const interstitial of params.interstitials) {
      const event: TimedEvent = {
        dateTime: toDateTime(startTime, interstitial.time),
        duration: interstitial.duration,
        assets: interstitial.assets
          ? await Promise.all(
              interstitial.assets.map(async (asset) => {
                return {
                  url: asset.url,
                  duration: await getDuration(asset.url),
                };
              }),
            )
          : undefined,
      };
      addTimedEvent(session.events, event);
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

function addTimedEvent(events: TimedEvent[], event: TimedEvent) {
  const target = events.find((event) => event.dateTime.equals(event.dateTime));
  if (target) {
    if (event.assets) {
      if (!target.assets) {
        target.assets = [];
      }
      target.assets.push(...event.assets);
    }
  } else {
    events.push(event);
  }
}

function toDateTime(startTime: DateTime, time: string | number) {
  return typeof time === "string"
    ? DateTime.fromISO(time)
    : startTime.plus({ seconds: time });
}
