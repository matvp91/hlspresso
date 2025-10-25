import rison from "rison";
import type { Bindings } from "../utils/bindings";

export interface MediaPayload {
  type: "video" | "audio" | "subtitles";
  path: string;
}

export function parseMediaPayload(_: Bindings, value: string): MediaPayload {
  const decoded = rison.decode<MediaPayload>(value);
  return {
    ...decoded,
  };
}

export function formatMediaPayload(_: Bindings, payload: MediaPayload) {
  return rison.encode({
    ...payload,
  });
}
