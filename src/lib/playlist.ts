import ky from "ky";
import { assert } from "../assert";
import {
  parseMainPlaylist,
  parseMediaPlaylist,
  stringifyMainPlaylist,
  stringifyMediaPlaylist,
} from "../parser/hls";
import type { MainPlaylist, MediaPlaylist } from "../parser/hls";
import { getVMAP } from "../parser/vmap";
import { mediaPayloadSchema } from "../schema";
import type { Interstitial, MediaPayload, Session } from "../types";
import type { Bindings } from "../utils/bindings";
import { getUrlCommonPrefix, replaceUrlParams, resolveUrl } from "../utils/url";
import { addInterstitialDateRanges } from "./interstitials";
import { mergeInterstitials, toDateTime, updateSession } from "./session";

type ProcessMainPlaylistParams = {
  bindings: Bindings;
  session: Session;
};

export async function processMainPlaylist({
  bindings,
  session,
}: ProcessMainPlaylistParams) {
  const { url } = session;
  await updateSessionOnMainPlaylist(bindings, session);

  const playlistText = await ky.get(url).text();
  const playlist = parseMainPlaylist(playlistText);

  playlist.comments = [
    `Generated with hlspresso, at ${session.startTime.toISO()}`,
  ];

  rewriteMediaUrlsInMain(playlist);

  return stringifyMainPlaylist(playlist);
}

type ProcessMediaPlaylistParams = {
  session: Session;
  payload: MediaPayload;
};

export async function processMediaPlaylist({
  session,
  payload,
}: ProcessMediaPlaylistParams) {
  const origUrl = resolveUrl({
    baseUrl: session.url,
    path: payload.path,
  });

  const playlistText = await ky.get(origUrl).text();
  const playlist = parseMediaPlaylist(playlistText);

  const isLive = !playlist.endlist;

  if (!isLive) {
    addSessionStartTimeAsPDT(session, playlist);
  }

  rewriteSegmentUrlsInMedia(playlist, origUrl);

  if (payload.type === "VIDEO") {
    addInterstitialDateRanges({
      session,
      playlist,
      isLive,
    });
  }

  return stringifyMediaPlaylist(playlist);
}

async function updateSessionOnMainPlaylist(
  bindings: Bindings,
  session: Session,
) {
  let storeSession = false;

  // If we have a vmap config but no result yet, we'll resolve it.
  if (session.vmap) {
    const vmap = await getVMAP({
      url: replaceUrlParams(session.vmap),
    });

    // Delete the VMAP url. We don't need to parse it again.
    session.vmap = undefined;

    const interstitials: Interstitial[] = [];
    // Add each adBreak to the list of assets.
    for (const adBreak of vmap.adBreaks) {
      if (!adBreak.adTagUri) {
        // TODO: Support vastAdData too.
        continue;
      }
      interstitials.push({
        dateTime: toDateTime(session.startTime, adBreak.time),
        assets: [
          {
            type: "VAST",
            url: adBreak.adTagUri,
          },
        ],
      });
    }

    mergeInterstitials(session.interstitials, interstitials);

    storeSession = true;
  }

  if (storeSession) {
    await updateSession(bindings, session);
  }
}
export async function getDuration(mainUrl: string) {
  const mainText = await ky.get(mainUrl).text();
  const main = parseMainPlaylist(mainText);

  const variant = main.variants[0];
  assert(variant, "Playlist should include atleast 1 variant");

  // Resolve and parse the first media playlist.
  const mediaUrl = resolveUrl({
    baseUrl: mainUrl,
    path: variant.uri,
  });

  const mediaText = await ky.get(mediaUrl).text();
  const media = parseMediaPlaylist(mediaText);

  // Sum each segment duration to get a sense of what the total duration
  // of the playlist may be.
  return media.segments.reduce((acc, segment) => {
    return acc + segment.duration;
  }, 0);
}

function rewriteMediaUrlsInMain(playlist: MainPlaylist) {
  let index = 0;
  for (const variant of playlist.variants) {
    variant.uri = `media/${mediaPayloadSchema.encode({
      type: "VIDEO",
      path: variant.uri,
    })}/video_${++index}.m3u8`;
  }
  for (const media of playlist.medias) {
    if (media.type === "AUDIO") {
      media.uri = `media/${mediaPayloadSchema.encode({
        type: "AUDIO",
        path: media.uri,
      })}/video_${++index}.m3u8`;
    }
    if (media.type === "SUBTITLES") {
      media.uri = `media/${mediaPayloadSchema.encode({
        type: "SUBTITLES",
        path: media.uri,
      })}/video_${++index}.m3u8`;
    }
  }
}

function rewriteSegmentUrlsInMedia(playlist: MediaPlaylist, origUrl: string) {
  const lookupMap = new Map<{ uri: string }, string>();

  // Collect all rewritable parts. These need to point
  // to the original URL.
  for (const segment of playlist.segments) {
    const origSegmentUrl = resolveUrl({
      baseUrl: origUrl,
      path: segment.uri,
    });
    lookupMap.set(segment, origSegmentUrl);
    if (segment.map) {
      const origMapUrl = resolveUrl({
        baseUrl: origUrl,
        path: segment.map.uri,
      });
      lookupMap.set(segment.map, origMapUrl);
    }
  }

  const baseUrl = getUrlCommonPrefix(Array.from(lookupMap.values()));

  if (baseUrl) {
    playlist.defines.push({
      name: "ORIG_BASE_URL",
      value: baseUrl,
    });
  }

  for (const [item, url] of lookupMap.entries()) {
    if (baseUrl) {
      // When we have a baseUrl, we can subtract that as we have it defined
      // in an X-DEFINE.
      item.uri = `{$ORIG_BASE_URL}${url.substring(baseUrl.length)}`;
    } else {
      item.uri = url;
    }
  }
}

function addSessionStartTimeAsPDT(session: Session, playlist: MediaPlaylist) {
  const firstSegment = playlist.segments[0];
  // Add our own PDT when VOD, we'll use this to insert
  // date ranges relative to the start of the session.
  assert(firstSegment, "Missing first segment");
  firstSegment.programDateTime = session.startTime;
}
