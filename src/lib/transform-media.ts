import type { DateTime } from "luxon";
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
  const dateTimes: DateTime[] = [];

  for (const asset of session.assets) {
    if (!dateTimes.some((dateTime) => asset.dateTime.equals(dateTime))) {
      dateTimes.push(asset.dateTime);
    }
  }

  for (const dateTime of dateTimes) {
    const assetListUrl = `/out/${formatAssetListPayload({
      sessionId: session.id,
      dateTime,
    })}/asset-list.json`;

    const clientAttributes: Record<string, number | string> = {
      RESTRICT: "SKIP,JUMP",
      "ASSET-LIST": assetListUrl,
      "CONTENT-MAY-VARY": "YES",
      "TIMELINE-STYLE": "HIGHLIGHT",
      "RESUME-OFFSET": 0,
    };

    if (dateTime.equals(session.startTime)) {
      clientAttributes.CUE = "ONCE,PRE";
    }

    playlist.dateRanges.push({
      classId: "com.apple.hls.interstitial",
      id: `hlspresso.${dateTime.toMillis()}`,
      startDate: dateTime,
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
