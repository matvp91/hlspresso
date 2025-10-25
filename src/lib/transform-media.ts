import rison from "rison";
import { assert } from "../assert";
import type { MediaPlaylist } from "../parser/types";
import type { Session } from "../types";
import { resolveUrl } from "../utils/url";

export function rewriteUrls(playlist: MediaPlaylist, playlistUrl: string) {
  for (const segment of playlist.segments) {
    segment.uri = resolveUrl(playlistUrl, segment.uri);
    if (segment.map) {
      segment.map.uri = resolveUrl(playlistUrl, segment.map.uri);
    }
  }
}

export function addStaticDateRanges(playlist: MediaPlaylist, session: Session) {
  // Grab a copy of the events in the session, we might add events from
  // elsewhere later on.
  const events = [...session.events];

  for (const event of events) {
    const assetListUrl = `/out/${rison.encode({
      sessionId: session.id,
      dateTime: event.dateTime.toISO(),
    })}/asset-list.json`;

    const clientAttributes: Record<string, number | string> = {
      RESTRICT: "SKIP,JUMP",
      "ASSET-LIST": assetListUrl,
      "CONTENT-MAY-VARY": "YES",
      "TIMELINE-STYLE": "HIGHLIGHT",
    };

    // These are only for VOD.
    clientAttributes["TIMELINE-OCCUPIES"] = "POINT";
    clientAttributes["RESUME-OFFSET"] = event.duration ?? 0;

    // Handle the preroll.
    if (event.dateTime.equals(session.startTime)) {
      clientAttributes.CUE = "ONCE,PRE";
    }

    playlist.dateRanges.push({
      classId: "com.apple.hls.interstitial",
      id: `hlspresso.${event.dateTime.toMillis()}`,
      startDate: event.dateTime,
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
