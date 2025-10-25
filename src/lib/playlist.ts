import ky from "ky";
import { parseMainPlaylist, parseMediaPlaylist } from "../parser";
import { resolveUrl } from "../utils/url";

export async function getMainPlaylist(url: string) {
  const text = await ky.get(url).text();
  return parseMainPlaylist(text);
}

export async function getMediaPlaylist(url: string) {
  const text = await ky.get(url).text();
  return parseMediaPlaylist(text);
}

export async function getDuration(url: string) {
  const main = await getMainPlaylist(url);
  if (!main.variants[0]) {
    throw new Error("The playlist does not contain any variants.");
  }

  const mediaUrl = resolveUrl(url, main.variants[0].uri);
  const media = await getMediaPlaylist(mediaUrl.toString());

  return media.segments.reduce((acc, segment) => {
    return acc + segment.duration;
  }, 0);
}
