import { DateTime } from "luxon";
import rison from "rison";
import { ApiError, ApiErrorCode } from "src/error";
import type { IntendedAny } from "../types";
import type { Bindings } from "../utils/bindings";

export interface MediaPayload {
  type: "video" | "audio" | "subtitles";
  path: string;
}

export function parseMediaPayload(_: Bindings, value: string): MediaPayload {
  const data = rison.decode<IntendedAny>(value);
  return {
    ...data,
    path: decodeURIComponent(data.path),
  };
}

export function formatMediaPayload(_: Bindings, payload: MediaPayload) {
  return rison.encode({
    ...payload,
    path: encodeURIComponent(payload.path),
  });
}

export interface AssetListPayload {
  dateTime: DateTime;
}

export function parseAssetListPayload(value: string) {
  const data = rison.decode<IntendedAny>(value);
  return {
    ...data,
    dateTime: DateTime.fromISO(data.dateTime),
  };
}

export function formatAssetListPayload(payload: AssetListPayload) {
  return rison.encode({
    ...payload,
    dateTime: payload.dateTime.toISO(),
  });
}

export function extractPayloadString(path: string, name: string) {
  const regex = new RegExp(`${name}/(\\([^)]+\\))`);
  const value = path.match(regex)?.[1];
  console.log(value);
  if (!value) {
    throw new ApiError(ApiErrorCode.INVALID_PAYLOAD);
  }
  return value;
}
