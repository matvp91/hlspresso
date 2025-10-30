import type { MediaPlaylist, Segment } from "../parser/hls";
import { assetListPayloadSchema } from "../schema";
import type { Interstitial, Session } from "../types";
import { mergeInterstitials } from "./session";

type AddInterstitialDateRangesParams = {
  session: Session;
  playlist: MediaPlaylist;
  isLive: boolean;
};

/**
 * Add interstitial daterange tags per session.
 */
export function addInterstitialDateRanges({
  session,
  playlist,
  isLive,
}: AddInterstitialDateRangesParams) {
  // Copy the array, we're going to add other interstitials there too.
  const interstitials = [...session.interstitials];
  // Segments might contain splice info, they could result in an interstitial tag.
  addSegmentInterstitials(interstitials, playlist.segments);

  for (const interstitial of interstitials) {
    const payload = assetListPayloadSchema.encode({
      dateTime: interstitial.dateTime,
    });

    const custom: Record<string, number | string> = {
      // RESTRICT: "SKIP,JUMP",
      RESTRICT: "JUMP",
      "ASSET-LIST": `/out/${session.id}/${payload}/asset-list.json`,
      "CONTENT-MAY-VARY": "YES",
      "TIMELINE-STYLE": "HIGHLIGHT",
      "TIMELINE-OCCUPIES": "POINT",
    };
    if (!isLive) {
      custom["RESUME-OFFSET"] = 0;
    }
    if (interstitial.duration) {
      custom["PLAYOUT-LIMIT"] = interstitial.duration;
      custom["TIMELINE-OCCUPIES"] = "RANGE";
      custom["RESUME-OFFSET"] = interstitial.duration;
    }

    if (interstitial.dateTime.equals(session.startTime)) {
      custom.CUE = "ONCE,PRE";
    }

    playlist.dateRanges.push({
      classId: "com.apple.hls.interstitial",
      id: `${btoa(interstitial.dateTime.toMillis().toString())}`,
      startDate: interstitial.dateTime,
      plannedDuration: interstitial.duration,
      custom,
    });
  }
}

function addSegmentInterstitials(
  interstitials: Interstitial[],
  segments: Segment[],
) {
  const segmentInterstitials: Interstitial[] = [];

  for (const segment of segments) {
    if (
      segment.spliceInfo &&
      segment.spliceInfo.type === "OUT" &&
      segment.programDateTime
    ) {
      segmentInterstitials.push({
        dateTime: segment.programDateTime,
        duration: segment.spliceInfo.duration,
        assets: [],
      });
    }
  }

  mergeInterstitials(interstitials, segmentInterstitials);
}
