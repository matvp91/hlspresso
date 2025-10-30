import { byteSequenceToHex } from "./helpers";
import type { HLSKey, HLSMap } from "./lexical-parse";
import type { MainPlaylist, MediaPlaylist } from "./types";

export function stringifyMainPlaylist(playlist: MainPlaylist) {
  const lines: string[] = [];

  lines.push("#EXTM3U", "#EXT-X-VERSION:8");

  if (playlist.comments) {
    for (const comment of playlist.comments) {
      lines.push(`## ${comment}`);
    }
  }

  if (playlist.independentSegments) {
    lines.push("#EXT-X-INDEPENDENT-SEGMENTS");
  }

  for (const define of playlist.defines) {
    const attrs = [];
    if (define.name !== undefined) {
      attrs.push(`NAME="${define.name}"`);
    }
    if (define.value !== undefined) {
      attrs.push(`VALUE="${define.value}"`);
    }
    if (define.import !== undefined) {
      attrs.push(`IMPORT="${define.import}"`);
    }
    lines.push(`#EXT-X-DEFINE:${attrs.join(",")}`);
  }

  if (playlist.medias.length) {
    lines.push("");
  }

  for (const media of playlist.medias) {
    const attrs = [
      `TYPE=${media.type}`,
      `GROUP-ID="${media.groupId}"`,
      `NAME="${media.name}"`,
    ];
    if (media.language) {
      attrs.push(`LANGUAGE="${media.language}"`);
    }
    if (media.default !== undefined) {
      attrs.push(`DEFAULT=${media.default ? "YES" : "NO"}`);
    }
    if (media.autoSelect !== undefined) {
      attrs.push(`AUTOSELECT=${media.autoSelect ? "YES" : "NO"}`);
    }
    if (media.uri) {
      attrs.push(`URI="${media.uri}"`);
    }
    if (media.channels) {
      attrs.push(`CHANNELS="${media.channels}"`);
    }
    if (media.characteristics) {
      attrs.push(`CHARACTERISTICS="${media.characteristics}"`);
    }
    lines.push(`#EXT-X-MEDIA:${attrs.join(",")}`);
  }

  if (playlist.variants.length) {
    lines.push("");
  }

  for (const variant of playlist.variants) {
    const attrs = [`BANDWIDTH=${variant.bandwidth}`];
    if (variant.codecs) {
      attrs.push(`CODECS="${variant.codecs}"`);
    }
    if (variant.resolution) {
      attrs.push(
        `RESOLUTION=${variant.resolution.width}x${variant.resolution.height}`,
      );
    }
    if (variant.audio) {
      if (
        !playlist.medias.find(
          (media) => media.type === "AUDIO" && media.groupId === variant.audio,
        )
      ) {
        continue;
      }
      attrs.push(`AUDIO="${variant.audio}"`);
    }
    if (variant.subtitles) {
      if (
        !playlist.medias.find(
          (media) =>
            media.type === "SUBTITLES" && media.groupId === variant.subtitles,
        )
      ) {
        continue;
      }
      attrs.push(`SUBTITLES="${variant.subtitles}"`);
    }
    lines.push(`#EXT-X-STREAM-INF:${attrs.join(",")}`);
    lines.push(variant.uri);
  }

  return lines.join("\n");
}

export function stringifyMediaPlaylist(playlist: MediaPlaylist) {
  const lines: string[] = [];

  lines.push(
    "#EXTM3U",
    "#EXT-X-VERSION:8",
    `#EXT-X-TARGETDURATION:${playlist.targetDuration}`,
  );

  if (playlist.playlistType) {
    lines.push(`#EXT-X-PLAYLIST-TYPE:${playlist.playlistType}`);
  }

  for (const define of playlist.defines) {
    const attrs = [];
    if (define.name !== undefined) {
      attrs.push(`NAME="${define.name}"`);
    }
    if (define.value !== undefined) {
      attrs.push(`VALUE="${define.value}"`);
    }
    if (define.import !== undefined) {
      attrs.push(`IMPORT="${define.import}"`);
    }
    lines.push(`#EXT-X-DEFINE:${attrs.join(",")}`);
  }

  if (playlist.independentSegments) {
    lines.push("#EXT-X-INDEPENDENT-SEGMENTS");
  }

  if (playlist.mediaSequenceBase) {
    lines.push(`#EXT-X-MEDIA-SEQUENCE:${playlist.mediaSequenceBase}`);
  }

  if (playlist.discontinuitySequenceBase) {
    lines.push(
      `#EXT-X-DISCONTINUITY-SEQUENCE:${playlist.discontinuitySequenceBase}`,
    );
  }

  let lastMap: HLSMap | undefined;
  let lastKey: HLSKey | undefined;

  for (const segment of playlist.segments) {
    // See https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis-16#section-4.4.4.5
    // It applies to every Media Segment that appears after it in the Playlist until the next
    // EXT-X-MAP tag or until the end of the Playlist.
    if (segment.map !== lastMap) {
      if (segment.map) {
        const attrs = [`URI="${segment.map.uri}"`];
        lines.push(`#EXT-X-MAP:${attrs.join(",")}`);
      }
      lastMap = segment.map;
    }
    if (segment.key !== lastKey) {
      if (segment.key) {
        const attrs = [`METHOD=${segment.key.method}`];
        if (segment.key.uri) {
          attrs.push(`URI="${segment.key.uri}"`);
        }
        if (segment.key.iv) {
          attrs.push(`IV=${byteSequenceToHex(segment.key.iv)}`);
        }
        if (segment.key.format) {
          attrs.push(`KEYFORMAT="${segment.key.format}"`);
        }
        if (segment.key.formatVersion) {
          attrs.push(`KEYFORMATVERSIONS="${segment.key.formatVersion}"`);
        }
        lines.push(`#EXT-X-KEY:${attrs.join(",")}`);
      }
      lastKey = segment.key;
    }

    if (segment.discontinuity) {
      lines.push("#EXT-X-DISCONTINUITY");
    }

    if (segment.spliceInfo) {
      if (segment.spliceInfo.type === "OUT") {
        const attrs = ["DERIVED"];
        if (segment.spliceInfo.duration) {
          attrs.push(`DURATION=${segment.spliceInfo.duration}`);
        }
        lines.push(`#EXT-X-CUE-OUT:${attrs.join(",")}`);
      }
    }

    if (segment.programDateTime) {
      lines.push(`#EXT-X-PROGRAM-DATE-TIME:${segment.programDateTime.toISO()}`);
    }

    let duration = segment.duration.toFixed(3);
    if (duration.match(/\./)) {
      duration = duration.replace(/\.?0+$/, "");
    }
    lines.push(`#EXTINF:${duration}`);

    lines.push(segment.uri);
  }

  if (playlist.endlist) {
    lines.push("#EXT-X-ENDLIST");
  }

  for (const dateRange of playlist.dateRanges) {
    const attrs = [
      `ID="${dateRange.id}"`,
      `START-DATE="${dateRange.startDate.toISO()}"`,
    ];

    if (dateRange.classId) {
      attrs.push(`CLASS="${dateRange.classId}"`);
    }
    if (dateRange.duration) {
      attrs.push(`DURATION=${dateRange.duration}`);
    }
    if (
      dateRange.plannedDuration &&
      dateRange.plannedDuration !== dateRange.duration
    ) {
      attrs.push(`PLANNED-DURATION=${dateRange.plannedDuration}`);
    }

    if (dateRange.custom) {
      const entries = Object.entries(dateRange.custom);
      for (const [key, value] of entries) {
        if (typeof value === "string") {
          attrs.push(`X-${key}="${value}"`);
        }
        if (typeof value === "number") {
          attrs.push(`X-${key}=${value}`);
        }
      }
    }

    lines.push(`#EXT-X-DATERANGE:${attrs.join(",")}`);
  }

  return lines.join("\n");
}
