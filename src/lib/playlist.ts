import ky from "ky";
import { assert } from "../assert";
import { parseMainPlaylist, parseMediaPlaylist } from "../parser";
import { resolveUrl } from "../utils/url";

export async function getMainPlaylist(url: string) {
  const text = await fetchText(url);
  return parseMainPlaylist(text);
}

export async function getMediaPlaylist(url: string) {
  const text = await fetchText(url);
  return parseMediaPlaylist(text);
}

export async function getDuration(url: string) {
  const main = await getMainPlaylist(url);

  const firstVariant = main.variants[0];
  assert(firstVariant, "Playlist should include atleast 1 variant");

  // Resolve and parse the first media playlist.
  const mediaUrl = resolveUrl({
    baseUrl: url,
    path: firstVariant.uri,
  });
  const media = await getMediaPlaylist(mediaUrl);

  // Sum each segment duration to get a sense of what the total duration
  // of the playlist may be.
  return media.segments.reduce((acc, segment) => {
    return acc + segment.duration;
  }, 0);
}

async function fetchText(url: string) {
  return await ky.get(url).text();
}
