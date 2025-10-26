import { DateTime } from "luxon";
import rison from "rison";
import type { IntendedAny } from "../types";
import type { Bindings } from "../utils/bindings";

export interface MediaPayload {
  type: "video" | "audio" | "subtitles";
  path: string;
}

export function parseMediaPayload(_: Bindings, value: string): MediaPayload {
  return rison.decode<MediaPayload>(value);
}

export function formatMediaPayload(_: Bindings, payload: MediaPayload) {
  return rison.encode(payload);
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
