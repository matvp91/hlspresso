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
  const tracking = Object.entries(ad.tracking).map(([type, urls]) => {
    return {
      type,
      urls,
    } as unknown as SignalingTrackingEvent;
  });
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
