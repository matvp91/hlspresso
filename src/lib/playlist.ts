import ky from "ky";
import { assert } from "../assert";
import {
  parseMainPlaylist,
  parseMediaPlaylist,
  stringifyMainPlaylist,
  stringifyMediaPlaylist,
} from "../parser";
import type { Session } from "../types";
import type { Bindings } from "../utils/bindings";
import { resolveUrl } from "../utils/url";
import type { MediaPayload } from "./payload";
import { rewriteMainUrls } from "./transform-main";
import {
  addStaticDateRanges,
  ensureProgramDateTime,
  rewriteMediaUrls,
} from "./transform-media";

type ProcessMainPlaylistParams = {
  bindings: Bindings;
  session: Session;
  url: string;
};

export async function processMainPlaylist({
  bindings,
  url,
}: ProcessMainPlaylistParams) {
  const playlistText = await fetchText(url);
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
  const playlistText = await fetchText(url);
  const playlist = parseMediaPlaylist(playlistText);

  ensureProgramDateTime(session, playlist);
  rewriteMediaUrls(playlist, url);

  if (payload.type === "video") {
    addStaticDateRanges(playlist, session);
  }

  return stringifyMediaPlaylist(playlist);
}

export async function getDuration(mainUrl: string) {
  const mainText = await fetchText(mainUrl);
  const main = parseMainPlaylist(mainText);

  const variant = main.variants[0];
  assert(variant, "Playlist should include atleast 1 variant");

  // Resolve and parse the first media playlist.
  const mediaUrl = resolveUrl({
    baseUrl: mainUrl,
    path: variant.uri,
  });

  const mediaText = await fetchText(mediaUrl);
  const media = parseMediaPlaylist(mediaText);

  // Sum each segment duration to get a sense of what the total duration
  // of the playlist may be.
  return media.segments.reduce((acc, segment) => {
    return acc + segment.duration;
  }, 0);
}

async function fetchText(url: string) {
  return await ky.get(url).text();
}
