import type { Ad } from "./lib/vast";

type SignalingPod = {
  start?: number;
  duration: number;
  slots?: SignalingSlot[];
  tracking: SignalingTrackingEvent[];
};

type SignalingSlot = {
  type: SignalingAdType;
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

type SignalingAdType = "linear";

type SignalingAdIdentifier = {
  scheme: string;
  value: string;
};

export type SignalingEventType =
  | "impression"
  | "clickTracking"
  | "complete"
  | "error"
  | "firstQuartile"
  | "loaded"
  | "midpoint"
  | "mute"
  | "pause"
  | "playerCollapse"
  | "playerExpand"
  | "podEnd"
  | "podStart"
  | "progress"
  | "resume"
  | "skip"
  | "start"
  | "thirdQuartile"
  | "unmute";

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
  if (ad.tracking.start) {
    tracking.push({ type: "start", urls: ad.tracking.start });
  }
  if (ad.tracking.firstQuartile) {
    tracking.push({ type: "firstQuartile", urls: ad.tracking.firstQuartile });
  }
  if (ad.tracking.midpoint) {
    tracking.push({ type: "midpoint", urls: ad.tracking.midpoint });
  }
  if (ad.tracking.thirdQuartile) {
    tracking.push({ type: "thirdQuartile", urls: ad.tracking.thirdQuartile });
  }
  if (ad.tracking.complete) {
    tracking.push({ type: "complete", urls: ad.tracking.complete });
  }
  // TODO: The rest of the tracking events...
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
