import ky from "ky";
import { assert } from "../assert";
import {
  parseMainPlaylist,
  parseMediaPlaylist,
  stringifyMainPlaylist,
  stringifyMediaPlaylist,
} from "../parser/hls";
import { getVMAP } from "../parser/vmap";
import type { Session } from "../types";
import type { Bindings } from "../utils/bindings";
import { replaceUrlParams, resolveUrl } from "../utils/url";
import type { MediaPayload } from "./payload";
import { toDateTime, updateSession } from "./session";
import { rewriteMainUrls } from "./transform-main";
import {
  addStaticDateRanges,
  ensureProgramDateTime,
  rewriteMediaUrls,
} from "./transform-media";

type ProcessMainPlaylistParams = {
  bindings: Bindings;
  session: Session;
};

export async function processMainPlaylist({
  bindings,
  session,
}: ProcessMainPlaylistParams) {
  const { url } = session;
  await initSessionOnMainRequest(bindings, session);

  const playlistText = await ky.get(url).text();
  const playlist = parseMainPlaylist(playlistText);

  rewriteMainUrls(bindings, playlist);

  return stringifyMainPlaylist(playlist);
}

type ProcessMediaPlaylistParams = {
  bindings: Bindings;
  session: Session;
  payload: MediaPayload;
  url: string;
};

export async function processMediaPlaylist({
  payload,
  session,
  url,
}: ProcessMediaPlaylistParams) {
  const playlistText = await ky.get(url).text();
  const playlist = parseMediaPlaylist(playlistText);

  ensureProgramDateTime(session, playlist);
  rewriteMediaUrls(playlist, url);

  if (payload.type === "video") {
    addStaticDateRanges(playlist, session);
  }

  return stringifyMediaPlaylist(playlist);
}

async function initSessionOnMainRequest(bindings: Bindings, session: Session) {
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
      if (adBreak.url) {
        session.assets.push({
          type: "VAST",
          dateTime: toDateTime(session.startTime, adBreak.time),
          url: adBreak.url,
        });
      }
      if (adBreak.data) {
        session.assets.push({
          type: "VASTDATA",
          dateTime: toDateTime(session.startTime, adBreak.time),
          data: adBreak.data,
        });
      }
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
