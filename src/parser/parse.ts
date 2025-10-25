import type { DateTime } from "luxon";
import { assert } from "../assert";
import {
  type HLSDateRange,
  type HLSDefine,
  type HLSKey,
  type HLSMap,
  type HLSPlaylistType,
  type Tag,
  type TagName,
  lexicalParse,
  nextLiteral,
} from "./lexical-parse";
import type {
  MainPlaylist,
  Media,
  MediaPlaylist,
  Segment,
  SpliceInfo,
  Variant,
} from "./types";

export function parseMainPlaylist(text: string): MainPlaylist {
  const tags = lexicalParse(text);

  let independentSegments = false;
  const variants: Variant[] = [];
  const medias: Media[] = [];
  const defines: HLSDefine[] = [];

  tags.forEach(([name, value], index) => {
    if (name === "EXT-X-INDEPENDENT-SEGMENTS") {
      independentSegments = true;
    }
    if (name === "EXT-X-STREAM-INF") {
      const uri = nextLiteral(tags, index);
      variants.push({
        uri,
        bandwidth: value.bandwidth,
        resolution: value.resolution,
        codecs: value.codecs,
        audio: value.audio,
        subtitles: value.subtitles,
      });
    }
    if (name === "EXT-X-MEDIA") {
      medias.push({
        type: value.type,
        groupId: value.groupId,
        name: value.name,
        uri: value.uri,
        channels: value.channels,
        language: value.language,
        default: value.default,
        autoSelect: value.autoSelect,
        characteristics: value.characteristics,
      });
    }
    if (name === "EXT-X-DEFINE") {
      defines.push(value);
    }
  });

  return {
    independentSegments,
    variants,
    medias,
    defines,
  };
}

export function parseMediaPlaylist(text: string): MediaPlaylist {
  const tags = lexicalParse(text);

  let targetDuration: number | undefined;
  let endlist = false;
  let playlistType: HLSPlaylistType | undefined;
  let independentSegments = false;
  let mediaSequenceBase: number | undefined;
  let discontinuitySequenceBase: number | undefined;
  const dateRanges: HLSDateRange[] = [];
  const segments: Segment[] = [];
  const defines: HLSDefine[] = [];

  for (const [name, value] of tags) {
    if (name === "EXT-X-TARGETDURATION") {
      targetDuration = value;
    }
    if (name === "EXT-X-ENDLIST") {
      endlist = true;
    }
    if (name === "EXT-X-PLAYLIST-TYPE") {
      playlistType = value;
    }
    if (name === "EXT-X-INDEPENDENT-SEGMENTS") {
      independentSegments = true;
    }
    if (name === "EXT-X-MEDIA-SEQUENCE") {
      mediaSequenceBase = value;
    }
    if (name === "EXT-X-DISCONTINUITY-SEQUENCE") {
      discontinuitySequenceBase = value;
    }
    if (name === "EXT-X-DATERANGE") {
      dateRanges.push(value);
    }
    if (name === "EXT-X-DEFINE") {
      defines.push(value);
    }
  }

  let segmentStart: number | null = null;
  tags.forEach(([name], index) => {
    if (segmentStart === null) {
      if (isSegmentTag(name)) {
        segmentStart = index;
      }
    } else if (name === "LITERAL") {
      const segmentTags = tags.slice(segmentStart, index + 1);
      const segment = parseSegment(segmentTags);
      segments.push(segment);
      segmentStart = null;
    }
  });

  normalizeSegments(segments);

  assert(targetDuration);

  return {
    targetDuration,
    endlist,
    playlistType,
    segments,
    independentSegments,
    mediaSequenceBase,
    discontinuitySequenceBase,
    dateRanges,
    defines,
  };
}

function parseSegment(tags: Tag[]): Segment {
  let duration: number | undefined;
  let discontinuity: boolean | undefined;
  let programDateTime: DateTime | undefined;
  let spliceInfo: SpliceInfo | undefined;
  let uri: string | undefined;
  let map: HLSMap | undefined;
  let key: HLSKey | undefined;

  for (const [name, value] of tags) {
    if (name === "EXTINF") {
      duration = value.duration;
    }
    if (name === "EXT-X-DISCONTINUITY") {
      discontinuity = true;
    }
    if (name === "EXT-X-PROGRAM-DATE-TIME") {
      programDateTime = value;
    }
    if (name === "EXT-X-CUE-IN") {
      spliceInfo = { type: "IN" };
    }
    if (name === "EXT-X-CUE-OUT") {
      spliceInfo = { type: "OUT", duration: value.duration };
    }
    if (name === "EXT-X-MAP") {
      map = value;
    }
    if (name === "EXT-X-KEY") {
      key = value;
    }
    if (name === "LITERAL") {
      uri = value;
    }
  }

  assert(uri, "parseSegment: uri not found");
  assert(duration, "parseSegment: duration not found");

  return {
    uri,
    duration,
    map,
    key,
    discontinuity,
    programDateTime,
    spliceInfo,
  };
}

function normalizeSegments(segments: Segment[]) {
  let lastMap: HLSMap | undefined;
  let lastKey: HLSKey | undefined;
  for (const segment of segments) {
    if (segment.map === undefined && lastMap) {
      segment.map = lastMap;
    } else {
      lastMap = segment.map;
    }

    if (segment.key === undefined && lastKey) {
      segment.key = lastKey;
    } else {
      lastKey = segment.key;
    }
  }
}

/**
 * Checks whether the tag name belongs to a segment.
 * @link https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis-16#section-4.4.4
 * @param name
 * @returns
 */
function isSegmentTag(name: TagName) {
  switch (name) {
    case "EXTINF":
    case "EXT-X-DISCONTINUITY":
    case "EXT-X-PROGRAM-DATE-TIME":
    case "EXT-X-MAP":
    case "EXT-X-CUE-OUT":
    case "EXT-X-CUE-IN":
    case "EXT-X-KEY":
      return true;
  }
  return false;
}
