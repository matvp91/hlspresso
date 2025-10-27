import crypto from "node:crypto";
import { DateTime } from "luxon";
import { ApiError } from "../error";
import type {
  Asset,
  CreateSessionParams,
  Interstitial,
  Session,
} from "../types";
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
    interstitials: [],
    vmap: params.vmap?.url,
  };

  if (params.interstitials) {
    for (const value of params.interstitials) {
      const assets: Asset[] = value.assets
        ? await Promise.all(
            value.assets.map(async (asset) => {
              if (asset.type === "static") {
                const duration = await getDuration(asset.url);
                return {
                  type: "STATIC",
                  url: asset.url,
                  duration,
                };
              }
              if (asset.type === "vast") {
                return {
                  type: "VAST",
                  url: asset.url,
                };
              }
              throw new Error("Unmapped asset type.");
            }),
          )
        : [];
      const interstitial: Interstitial = {
        dateTime: toDateTime(session.startTime, value.time),
        duration: value.duration,
        assets,
      };
      pushInterstitial(session.interstitials, interstitial);
    }
  }

  const json = SuperJSON.stringify(session);
  await bindings.kv.set(`session:${id}`, json);

  return session;
}

export async function getSession(bindings: Bindings, id: string) {
  const data = await bindings.kv.get(`session:${id}`);
  if (!data) {
    throw new ApiError(
      "SESSION_NOT_FOUND",
      `Session with id ${id} cannot be found`,
    );
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

export function pushInterstitial(
  interstitials: Interstitial[],
  value: Interstitial,
) {
  const target = interstitials.find((interstitial) =>
    interstitial.dateTime.equals(value.dateTime),
  );
  if (!target) {
    // Create, if not exists.
    interstitials.push(value);
  } else {
    // Merge.
    if (value.assets) {
      if (!target.assets) {
        target.assets = [];
      }
      target.assets.push(...value.assets);
    }
    if (value.duration) {
      target.duration = value.duration;
    }
  }
}
