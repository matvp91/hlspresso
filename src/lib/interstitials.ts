import type { MediaPlaylist } from "../parser/hls";
import { assetListPayloadSchema } from "../schema";
import type { Session } from "../types";

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
  for (const interstitial of session.interstitials) {
    const payload = assetListPayloadSchema.encode({
      dateTime: interstitial.dateTime,
    });

    const clientAttributes: Record<string, number | string> = {
      RESTRICT: "SKIP,JUMP",
      "ASSET-LIST": `/out/${session.id}/${payload}/asset-list.json`,
      "CONTENT-MAY-VARY": "YES",
      "TIMELINE-STYLE": "HIGHLIGHT",
    };
    if (!isLive) {
      clientAttributes["RESUME-OFFSET"] = 0;
    }
    if (interstitial.duration) {
      clientAttributes["PLAYOUT-LIMIT"] = interstitial.duration;
    }

    if (interstitial.dateTime.equals(session.startTime)) {
      clientAttributes.CUE = "ONCE,PRE";
    }

    playlist.dateRanges.push({
      classId: "com.apple.hls.interstitial",
      id: `${btoa(interstitial.dateTime.toMillis().toString())}`,
      startDate: interstitial.dateTime,
      clientAttributes,
      plannedDuration: interstitial.duration,
    });
  }
}
