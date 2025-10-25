import { DateTime } from "luxon";
import { assert } from "../assert";
import { hexToByteSequence, mapAttributes, partOf } from "./helpers";

// Based on the latest spec:
// https://datatracker.ietf.org/doc/html/draft-pantos-hls-rfc8216bis

type OneOf<T extends readonly string[]> = T[number];

const EMPTY_TAGS = [
  "EXTM3U",
  "EXT-X-DISCONTINUITY",
  "EXT-X-ENDLIST",
  "EXT-X-I-FRAMES-ONLY",
  "EXT-X-INDEPENDENT-SEGMENTS",
  "EXT-X-CUE-IN",
] as const;

const NUMBER_TAGS = [
  "EXT-X-VERSION",
  "EXT-X-TARGETDURATION",
  "EXT-X-MEDIA-SEQUENCE",
  "EXT-X-DISCONTINUITY-SEQUENCE",
] as const;

const DATE_TAGS = ["EXT-X-PROGRAM-DATE-TIME"] as const;

export type Tag =
  | ["LITERAL", string]
  | [OneOf<typeof EMPTY_TAGS>, null]
  | [OneOf<typeof NUMBER_TAGS>, number]
  | [OneOf<typeof DATE_TAGS>, DateTime]
  | ["EXTINF", HLSExtInf]
  | ["EXT-X-PLAYLIST-TYPE", HLSPlaylistType]
  | ["EXT-X-STREAM-INF", HLSStreamInf]
  | ["EXT-X-MEDIA", HLSMedia]
  | ["EXT-X-MAP", HLSMap]
  | ["EXT-X-DATERANGE", HLSDateRange]
  | ["EXT-X-CUE-OUT", HLSCueOut]
  | ["EXT-X-KEY", HLSKey]
  | ["EXT-X-DEFINE", HLSDefine];

export type TagName = Tag[0];

export type HLSExtInf = {
  duration: number;
};

export type HLSStreamInf = {
  bandwidth: number;
  codecs?: string;
  resolution?: HLSResolution;
  audio?: string;
  subtitles?: string;
};

export type HLSMediaType = "AUDIO" | "SUBTITLES";

export type HLSMedia = {
  type: HLSMediaType;
  groupId: string;
  name: string;
  language?: string;
  uri: string;
  channels?: string;
  default?: boolean;
  autoSelect?: boolean;
  characteristics?: string;
};

export type HLSCueOut = {
  duration: number;
};

export type HLSResolution = {
  width: number;
  height: number;
};

export type HLSPlaylistType = "EVENT" | "VOD";

export type HLSMap = {
  uri: string;
};

export type HLSDateRange = {
  id: string;
  classId: string;
  startDate: DateTime;
  duration?: number;
  plannedDuration?: number;
  clientAttributes?: Record<string, string | number>;
};

export type HLSKey = {
  method: string;
  uri?: string;
  iv?: Uint8Array;
  format?: string;
  formatVersion?: string;
};

export type HLSDefine = {
  name?: string;
  value?: string;
  import?: string;
};

function parseLine(line: string): Tag | null {
  const [name, param] = splitLine(line);

  if (partOf(EMPTY_TAGS, name)) {
    return [name, null];
  }

  if (partOf(NUMBER_TAGS, name)) {
    assert(param, "NUMBER_TAGS: no param");
    return [name, Number.parseFloat(param)];
  }

  if (partOf(DATE_TAGS, name)) {
    assert(param, "DATE_TAGS: no param");
    return [name, DateTime.fromISO(param)];
  }

  switch (name) {
    case "EXT-X-PLAYLIST-TYPE":
      assert(param, "EXT-X-PLAYLIST-TYPE: no param");
      if (param === "EVENT" || param === "VOD") {
        return [name, param];
      }
      throw new Error("EXT-X-PLAYLIST-TYPE: param must be EVENT or VOD");

    case "EXTINF": {
      assert(param, "EXTINF: no param");
      const chunks = param.split(",");
      assert(chunks[0], "EXTINF: no duration in param");
      return [
        name,
        {
          duration: Number.parseFloat(chunks[0]),
        },
      ];
    }

    case "EXT-X-STREAM-INF": {
      assert(param, "EXT-X-STREAM-INF: no param");

      const attrs: Partial<HLSStreamInf> = {};

      mapAttributes(param, (key, value) => {
        switch (key) {
          case "BANDWIDTH":
            attrs.bandwidth = Number.parseFloat(value);
            break;

          case "RESOLUTION": {
            const chunks = value.split("x");
            assert(chunks[0], "EXT-X-STREAM-INF DURATION: no width");
            assert(chunks[1], "EXT-X-STREAM-INF DURATION: no height");
            attrs.resolution = {
              width: Number.parseFloat(chunks[0]),
              height: Number.parseFloat(chunks[1]),
            };
            break;
          }

          case "AUDIO":
            attrs.audio = value;
            break;

          case "SUBTITLES":
            attrs.subtitles = value;
            break;

          case "CODECS":
            attrs.codecs = value;
            break;
        }
      });

      assert(attrs.bandwidth, "EXT-X-STREAM-INF: no bandwidth");

      return [
        name,
        {
          bandwidth: attrs.bandwidth,
          resolution: attrs.resolution,
          audio: attrs.audio,
          subtitles: attrs.subtitles,
          codecs: attrs.codecs,
        },
      ];
    }

    case "EXT-X-MEDIA": {
      assert(param, "EXT-X-MEDIA: no param");

      const attrs: Partial<HLSMedia> = {};

      mapAttributes(param, (key, value) => {
        switch (key) {
          case "TYPE":
            if (value === "AUDIO" || value === "SUBTITLES") {
              attrs.type = value;
            } else {
              throw new Error("EXT-X-MEDIA: invalid type param");
            }
            break;
          case "GROUP-ID":
            attrs.groupId = value;
            break;
          case "LANGUAGE":
            attrs.language = value;
            break;
          case "NAME":
            attrs.name = value;
            break;
          case "URI":
            attrs.uri = value;
            break;
          case "CHANNELS":
            attrs.channels = value;
            break;
          case "DEFAULT":
            attrs.default = value === "YES";
            break;
          case "AUTOSELECT":
            attrs.autoSelect = value === "YES";
            break;
          case "CHARACTERISTICS":
            attrs.characteristics = value;
            break;
        }
      });

      assert(attrs.type, "EXT-X-MEDIA: no type");
      assert(attrs.groupId, "EXT-X-MEDIA: no groupId");
      assert(attrs.name, "EXT-X-MEDIA: no name");
      assert(attrs.uri, "EXT-X-MEDIA: no uri");

      return [
        name,
        {
          type: attrs.type,
          groupId: attrs.groupId,
          language: attrs.language,
          name: attrs.name,
          uri: attrs.uri,
          channels: attrs.channels,
          default: attrs.default,
          autoSelect: attrs.autoSelect,
          characteristics: attrs.characteristics,
        },
      ];
    }

    case "EXT-X-MAP": {
      assert(param, "EXT-X-MAP: no param");

      const attrs: Partial<HLSMap> = {};

      mapAttributes(param, (key, value) => {
        switch (key) {
          case "URI":
            attrs.uri = value;
            break;
        }
      });

      assert(attrs.uri, "EXT-X-MAP: no uri");

      return [
        name,
        {
          uri: attrs.uri,
        },
      ];
    }

    case "EXT-X-DATERANGE": {
      assert(param, "EXT-X-DATERANGE: no param");

      const attrs: Partial<HLSDateRange> = {};

      mapAttributes(param, (key, value) => {
        switch (key) {
          case "ID":
            attrs.id = value;
            break;
          case "CLASS":
            attrs.classId = value;
            break;
          case "START-DATE":
            attrs.startDate = DateTime.fromISO(value);
            break;
          case "DURATION":
            attrs.duration = Number.parseFloat(value);
            break;
          case "PLANNED-DURATION":
            attrs.plannedDuration = Number.parseFloat(value);
            break;
          default: {
            if (!key.startsWith("X-")) {
              break;
            }

            if (!attrs.clientAttributes) {
              attrs.clientAttributes = {};
            }

            const clientAttrName = key.substring(2, key.length);

            if (!Number.isNaN(+value)) {
              // If the value represents a number, it is most likely a number.
              attrs.clientAttributes[clientAttrName] = Number.parseFloat(value);
            } else {
              attrs.clientAttributes[clientAttrName] = value;
            }

            break;
          }
        }
      });

      assert(attrs.id, "EXT-X-DATERANGE: no id");
      assert(attrs.classId, "EXT-X-DATERANGE: no classId");
      assert(attrs.startDate, "EXT-X-DATERANGE: no startDate");

      return [
        name,
        {
          id: attrs.id,
          classId: attrs.classId,
          startDate: attrs.startDate,
          clientAttributes: attrs.clientAttributes,
        },
      ];
    }

    case "EXT-X-DEFINE": {
      assert(param, "EXT-X-DEFINE: no param");

      const attrs: Partial<HLSDefine> = {};

      mapAttributes(param, (key, value) => {
        switch (key) {
          case "NAME":
            attrs.name = value;
            break;
          case "VALUE":
            attrs.value = value;
            break;
          case "IMPORT":
            attrs.import = value;
            break;
        }
      });

      return [
        name,
        {
          name: attrs.name,
          value: attrs.value,
          import: attrs.import,
        },
      ];
    }

    case "EXT-X-CUE-OUT": {
      assert(param, "EXT-X-CUE-OUT: no param");

      // EXT-X-CUE-OUT can also contain only a number. Try to parse it,
      // and assume its the duration.
      const valueAsNumber = Number.parseFloat(param);
      if (!Number.isNaN(valueAsNumber)) {
        return [
          name,
          {
            duration: valueAsNumber,
          },
        ];
      }

      const attrs: Partial<HLSCueOut> = {};

      mapAttributes(param, (key, value) => {
        switch (key) {
          case "DURATION":
            attrs.duration = Number.parseFloat(value);
            break;
        }
      });

      assert(attrs.duration, "EXT-X-CUE-OUT: no duration");

      return [
        name,
        {
          duration: attrs.duration,
        },
      ];
    }

    case "EXT-X-KEY": {
      assert(param, "EXT-X-KEY: no param");

      const attrs: Partial<HLSKey> = {};

      mapAttributes(param, (key, value) => {
        switch (key) {
          case "METHOD":
            attrs.method = value;
            break;
          case "URI":
            attrs.uri = value;
            break;
          case "KEYFORMAT":
            attrs.format = value;
            break;
          case "KEYFORMATVERSION":
            attrs.formatVersion = value;
            break;
          case "IV":
            attrs.iv = parseIV(value);
            break;
        }
      });

      assert(attrs.method, "EXT-X-KEY: no method");

      return [
        name,
        {
          method: attrs.method,
          uri: attrs.uri,
          iv: attrs.iv,
          format: attrs.format,
          formatVersion: attrs.formatVersion,
        },
      ];
    }

    default:
      return null;
  }
}

function parseIV(value: string) {
  const iv = hexToByteSequence(value);
  if (iv.length !== 16) {
    throw new Error("IV must be a 128-bit unsigned integer");
  }
  return iv;
}

function splitLine(line: string): [string, string | null] {
  const index = line.indexOf(":");
  if (index === -1) {
    return [line.slice(1).trim(), null];
  }
  return [line.slice(1, index).trim(), line.slice(index + 1).trim()];
}

export function lexicalParse(text: string) {
  const tags: Tag[] = [];

  for (const l of text.split("\n")) {
    const line = l.trim();
    if (!line) {
      continue;
    }

    if (line.startsWith("#")) {
      if (line.startsWith("#EXT")) {
        const tag = parseLine(line);
        if (tag) {
          tags.push(tag);
        }
      }
      continue;
    }

    tags.push(["LITERAL", line]);
  }

  if (!tags.length) {
    throw new Error("lexicalParse: no tags");
  }

  return tags;
}

export function nextLiteral(tags: Tag[], index: number) {
  if (!tags[index + 1]) {
    throw new Error("Expecting next tag to be found");
  }
  const tag = tags[index + 1];
  if (!tag) {
    throw new Error(`Expected valid tag on ${index + 1}`);
  }
  const [name, value] = tag;
  if (name !== "LITERAL") {
    throw new Error("Expecting next tag to be a literal");
  }
  return value;
}
