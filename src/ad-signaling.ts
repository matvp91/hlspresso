import type { Ad } from "./lib/vast";

type SignalingPod = {
  start?: number;
  duration: number;
  slots?: SignalingSlot[];
  tracking: SignalingTrackingEvent[];
};

type SignalingSlot = {
  type: "linear";
  start: number;
  duration: number;
  identifiers: SignalingAdIdentifier[];
  tracking: SignalingTrackingEvent[];
};

type SignalingTrackingEvent = {
  type: SignalingEventType;
  offset?: number;
  urls: string[];
};

type SignalingAdIdentifier = {
  scheme: string;
  value: string;
};

type SignalingEventType =
  | "impression"
  | "clickTracking"
  | "error"
  // Break
  | "podEnd"
  | "podStart"
  // Lifecycle
  | "loaded"
  | "start"
  | "firstQuartile"
  | "midpoint"
  | "thirdQuartile"
  | "complete"
  // Volume
  | "mute"
  | "unmute"
  // State
  | "pause"
  | "resume"
  // Other
  | "skip"
  | "progress"
  | "playerCollapse"
  | "playerExpand";

type SignalingBaseEnvelope = {
  version: 2;
} & (
  | {
      type: "slot";
      payload: SignalingSlot[];
    }
  | {
      type: "pod";
      payload: SignalingPod[];
    }
);

export function createAdCreativeSignaling(
  ad: Ad,
  start: number,
): Extract<SignalingBaseEnvelope, { type: "slot" }> {
  const tracking: SignalingTrackingEvent[] = [];
  for (const type in ad.tracking) {
    const urls = ad.tracking[type];
    if (!urls || !urls.length) {
      continue;
    }
    if (
      type === "start" ||
      type === "firstQuartile" ||
      type === "midpoint" ||
      type === "thirdQuartile" ||
      type === "complete" ||
      type === "mute" ||
      type === "unmute" ||
      type === "pause" ||
      type === "resume" ||
      type === "error" ||
      type === "impression"
    ) {
      tracking.push({
        type,
        urls,
      });
    }
    if (type === "collapse") {
      tracking.push({
        type: "playerCollapse",
        urls,
      });
    }
    if (type === "expand") {
      tracking.push({
        type: "playerExpand",
        urls,
      });
    }
    // TODO: What to do with fullscreen and fullscreenExit?
  }
  return {
    version: 2,
    type: "slot",
    payload: [
      {
        type: "linear",
        start,
        duration: ad.duration,
        identifiers: [
          {
            scheme: "adId",
            value: ad.id,
          },
        ],
        tracking,
      },
    ],
  };
}
