import { assert } from "../assert";
import type { MediaPlaylist } from "../parser/hls";
import type { Session } from "../types";
import { resolveUrl } from "../utils/url";
import { formatAssetListPayload } from "./payload";

export function rewriteMediaUrls(playlist: MediaPlaylist, playlistUrl: string) {
  for (const segment of playlist.segments) {
    segment.uri = resolveUrl({
      baseUrl: playlistUrl,
      path: segment.uri,
    });
    if (segment.map) {
      segment.map.uri = resolveUrl({
        baseUrl: playlistUrl,
        path: segment.map.uri,
      });
    }
  }
}

export function addStaticDateRanges(playlist: MediaPlaylist, session: Session) {
  const isLive = !playlist.endlist;

  for (const interstitial of session.interstitials) {
    const assetListUrl = `/out/${session.id}/interstitial/${formatAssetListPayload(
      {
        dateTime: interstitial.dateTime,
      },
    )}/asset-list.json`;

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
      clientAttributes["TIMELINE-OCCUPIES"] = "POINT";
      clientAttributes["PLAYOUT-LIMIT"] = interstitial.duration;
      clientAttributes["RESUME-OFFSET"] = interstitial.duration;
    }

    if (interstitial.dateTime.equals(session.startTime)) {
      clientAttributes.CUE = "ONCE,PRE";
    }

    playlist.dateRanges.push({
      classId: "com.apple.hls.interstitial",
      id: `${btoa(interstitial.dateTime.toMillis().toString())}`,
      startDate: interstitial.dateTime,
      clientAttributes,
    });
  }
}

export function ensureProgramDateTime(
  session: Session,
  playlist: MediaPlaylist,
) {
  const firstSegment = playlist.segments[0];
  if (playlist.endlist) {
    // Add our own PDT when VOD, we'll use this to insert
    // date ranges relative to the start of the session.
    assert(firstSegment, "Missing first segment");
    firstSegment.programDateTime = session.startTime;
  }
}
