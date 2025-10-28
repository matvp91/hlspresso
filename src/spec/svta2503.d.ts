export namespace svta2503 {
  export type Pod = {
    start?: number;
    duration: number;
    slots?: Slot[];
    tracking: TrackingEvent[];
  };

  export type Slot = {
    type: "linear";
    start: number;
    duration: number;
    identifiers: AdIdentifier[];
    tracking: TrackingEvent[];
  };

  export type TrackingEvent = {
    type: EventType;
    offset?: number;
    urls: string[];
  };

  export type AdIdentifier = {
    scheme: string;
    value: string;
  };

  export type EventType =
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

  export type BaseEnvelope = {
    version: 2;
  } & (
    | {
        type: "slot";
        payload: Slot[];
      }
    | {
        type: "pod";
        payload: Pod[];
      }
  );
}
