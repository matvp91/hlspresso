import { DateTime } from "luxon";
import rison from "rison";
import { ApiError, ApiErrorCode } from "../error";
import type { AssetListPayload, IntendedAny, MediaPayload } from "../types";
import type { Bindings } from "../utils/bindings";

export function parseMediaPayload(_: Bindings, path: string): MediaPayload {
  const payloadStr = findPayloadStrInPath(path, "media");
  const data = rison.decode<IntendedAny>(payloadStr);
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

export function parseAssetListPayload(path: string) {
  const payloadStr = findPayloadStrInPath(path, "asset-list");
  const data = rison.decode<IntendedAny>(payloadStr);
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

function findPayloadStrInPath(path: string, name: string) {
  const regex = new RegExp(`${name}/(\\([^)]+\\))`);
  const value = path.match(regex)?.[1];
  if (!value) {
    throw new ApiError(ApiErrorCode.INVALID_PAYLOAD);
  }
  return value;
}
