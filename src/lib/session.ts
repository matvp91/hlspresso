import crypto from "node:crypto";
import { DateTime } from "luxon";
import { ApiError } from "../error";
import type { AppContext } from "../routes";
import { sessionSchema } from "../schema";
import type {
  Asset,
  CreateSessionParams,
  Interstitial,
  Session,
} from "../types";
import { getDuration } from "./playlist";

export async function createSession(
  c: AppContext,
  params: CreateSessionParams,
) {
  let id = crypto.randomUUID();
  if (params.group) {
    // If we have a group, prepend it.
    id = `${params.group}:${id}`;
  }

  const startTime = DateTime.now();

  const session: Session = {
    id,
    startTime,
    expiry: params.expiry === false ? 60 * 60 * 24 * 365 * 5 : params.expiry,
    url: params.url,
    interstitials: [],
    vmap: params.vmap,
    vast: params.vast,
    params: params.params,
    filter: params.filter,
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
              return asset;
            }),
          )
        : [];
      interstitials.push({
        dateTime: toDateTime(session.startTime, value.time),
        duration: value.duration,
        assets,
      });
    }

    mergeInterstitials(session.interstitials, interstitials);
  }

  c.var.logger.info(session, "Created new session");

  const json = sessionSchema.encode(session);
  await setStoredSession(c, id, json, session.expiry);

  return session;
}

export async function getSession(c: AppContext, id: string) {
  let json: string | null;
  try {
    json = await c.var.kv.get(`session:${id}`);
  } catch (cause) {
    throw new ApiError({
      code: "SESSION_STORE_UNAVAILABLE",
      message: "The session store is temporarily unavailable.",
      cause,
    });
  }
  if (!json) {
    throw new ApiError({
      code: "SESSION_NOT_FOUND",
      message: "The session was not found or has expired.",
    });
  }
  const session = sessionSchema.parse(json);

  // Check if the session is expired, we might still have it in kv.
  const expiryDate = session.startTime.plus({ seconds: session.expiry });
  if (DateTime.now() > expiryDate) {
    throw new ApiError({
      code: "SESSION_NOT_FOUND",
      message: "The session was not found or has expired.",
    });
  }

  return session;
}

export async function updateSession(c: AppContext, session: Session) {
  const { id } = session;
  const json = sessionSchema.encode(session);
  await setStoredSession(c, id, json, session.expiry);
}

async function setStoredSession(
  c: AppContext,
  id: string,
  json: string,
  expiry: number,
) {
  try {
    await c.var.kv.set(`session:${id}`, json, expiry);
  } catch (cause) {
    throw new ApiError({
      code: "SESSION_STORE_UNAVAILABLE",
      message: "The session store is temporarily unavailable.",
      cause,
    });
  }
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
