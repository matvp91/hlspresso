import crypto from "node:crypto";
import { DateTime } from "luxon";
import { ApiError } from "../error";
import { sessionSchema } from "../schema";
import type {
  Asset,
  CreateSessionParams,
  Interstitial,
  Session,
} from "../types";
import type { Bindings } from "../utils/bindings";
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
    expiry: params.expiry,
    url: params.url,
    interstitials: [],
    vmap: params.vmap?.url,
  };

  if (params.interstitials) {
    const interstitials: Interstitial[] = [];

    for (const value of params.interstitials) {
      const assets: Asset[] = value.assets
        ? await Promise.all(
            value.assets.map(async (asset) => {
              if (asset.type === "STATIC") {
                const duration = await getDuration(asset.url);
                return {
                  type: "STATIC",
                  url: asset.url,
                  duration,
                };
              }
              if (asset.type === "VAST") {
                return {
                  type: "VAST",
                  url: asset.url,
                };
              }
              throw new Error("Unmapped asset type.");
            }),
          )
        : [];
      interstitials.push({
        dateTime: toDateTime(session.startTime, value.time),
        duration: value.duration,
        assets,
      });
    }

    session.interstitials = mergeInterstitials(
      session.interstitials,
      interstitials,
    );
  }

  const json = sessionSchema.encode(session);
  await bindings.kv.set(`session:${id}`, json, session.expiry);

  return session;
}

export async function getSession(bindings: Bindings, id: string) {
  const json = await bindings.kv.get(`session:${id}`);
  if (!json) {
    throw new ApiError({
      code: "NOT_FOUND",
      message: "Session not found",
    });
  }
  const session = sessionSchema.parse(json);

  // Check if the session is expired, we might still have it in kv.
  const expiryDate = session.startTime.plus({ seconds: session.expiry });
  if (DateTime.now() > expiryDate) {
    throw new ApiError({
      code: "NOT_FOUND",
      message: "Session is expired",
    });
  }

  return session;
}

export async function updateSession(bindings: Bindings, session: Session) {
  const { id } = session;
  const json = sessionSchema.encode(session);
  await bindings.kv.set(`session:${id}`, json, session.expiry);
}

export function toDateTime(startTime: DateTime, time: string | number) {
  return typeof time === "string"
    ? DateTime.fromISO(time)
    : startTime.plus({ seconds: time });
}

export function mergeInterstitials(
  currentList: Interstitial[],
  nextList: Interstitial[],
) {
  for (const next of nextList) {
    const target = currentList.find((value) =>
      value.dateTime.equals(next.dateTime),
    );
    if (!target) {
      // Create, if not exists.
      currentList.push(next);
    } else {
      // Merge.
      if (next.assets) {
        if (!target.assets) {
          target.assets = [];
        }
        target.assets.push(...next.assets);
      }
      if (next.duration) {
        target.duration = next.duration;
      }
    }
  }
  return currentList;
}
