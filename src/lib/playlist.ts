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
import type { Interstitial, MediaPayload, Session } from "../types";
import type { Bindings } from "../utils/bindings";
import { replaceUrlParams, resolveUrl } from "../utils/url";
import { addInterstitialDateRanges } from "./interstitials";
import { formatMediaPayload } from "./payload";
import { toDateTime, updateSession } from "./session";
import { pushInterstitial } from "./session";

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

  rewriteMediaUrlsInMain(bindings, playlist);

  return stringifyMainPlaylist(playlist);
}

type ProcessMediaPlaylistParams = {
  bindings: Bindings;
  session: Session;
  payload: MediaPayload;
  origUrl: string;
};

export async function processMediaPlaylist({
  payload,
  session,
  origUrl,
}: ProcessMediaPlaylistParams) {
  const playlistText = await ky.get(origUrl).text();
  const playlist = parseMediaPlaylist(playlistText);

  const isLive = !playlist.endlist;

  if (!isLive) {
    addSessionStartTimeAsPDT(session, playlist);
  }

  rewriteSegmentUrlsInMedia(playlist, origUrl);

  if (payload.type === "video") {
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

    // Add each adBreak to the list of assets.
    for (const adBreak of vmap.adBreaks) {
      if (!adBreak.adTagUri) {
        // TODO: Support vastAdData too.
        continue;
      }
      const interstitial: Interstitial = {
        dateTime: toDateTime(session.startTime, adBreak.time),
        assets: [
          {
            type: "VAST",
            url: adBreak.adTagUri,
          },
        ],
      };
      pushInterstitial(session.interstitials, interstitial);
    }

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

function rewriteMediaUrlsInMain(bindings: Bindings, playlist: MainPlaylist) {
  let index = 0;
  for (const variant of playlist.variants) {
    index++;
    variant.uri = `media/${formatMediaPayload(bindings, {
      type: "video",
      path: variant.uri,
    })}/video_${index}.m3u8`;
  }
  for (const media of playlist.medias) {
    index++;
    const name = `${media.type.toLowerCase()}_${index}`;
    if (media.type === "AUDIO") {
      media.uri = `media/${formatMediaPayload(bindings, {
        type: "audio",
        path: media.uri,
      })}/${name}.m3u8`;
    }
    if (media.type === "SUBTITLES") {
      media.uri = `media/${formatMediaPayload(bindings, {
        type: "subtitles",
        path: media.uri,
      })}/${name}.m3u8`;
    }
  }
}

function rewriteSegmentUrlsInMedia(playlist: MediaPlaylist, origUrl: string) {
  for (const segment of playlist.segments) {
    segment.uri = resolveUrl({
      baseUrl: origUrl,
      path: segment.uri,
    });
    if (segment.map) {
      segment.map.uri = resolveUrl({
        baseUrl: origUrl,
        path: segment.map.uri,
      });
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
