import type { MediaPlaylist } from "../parser/hls";
import type { AssetListSig, Session } from "../types";
import { formatSig } from "./signature";

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
    const assetListUrl = `/out/${session.id}/asset-list.json?sig=${formatSig<AssetListSig>(
      {
        dateTime: interstitial.dateTime,
      },
    )}`;

    const clientAttributes: Record<string, number | string> = {
      RESTRICT: "SKIP,JUMP",
      "ASSET-LIST": assetListUrl,
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
