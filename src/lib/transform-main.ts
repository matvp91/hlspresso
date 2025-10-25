import type { MainPlaylist } from "../parser/types";
import type { Bindings } from "../utils/bindings";
import { formatMediaPayload } from "./payload";

export function rewriteMainUrls(bindings: Bindings, playlist: MainPlaylist) {
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
