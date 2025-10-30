import type { DateTime } from "luxon";
import type {
  HLSDateRange,
  HLSDefine,
  HLSKey,
  HLSMap,
  HLSMediaType,
  HLSPlaylistType,
  HLSResolution,
} from "./lexical-parse";

export type MainPlaylist = {
  independentSegments?: boolean;
  variants: Variant[];
  medias: Media[];
  defines: HLSDefine[];
  comments?: string[];
};

export type Variant = {
  uri: string;
  bandwidth: number;
  codecs?: string;
  resolution?: HLSResolution;
  audio?: string;
  subtitles?: string;
};

export type Media = {
  groupId: string;
  name: string;
  type: HLSMediaType;
  uri: string;
  language?: string;
  channels?: string;
  default?: boolean;
  autoSelect?: boolean;
  characteristics?: string;
};

export type MediaPlaylist = {
  independentSegments?: boolean;
  targetDuration: number;
  endlist: boolean;
  playlistType?: HLSPlaylistType;
  segments: Segment[];
  mediaSequenceBase?: number;
  discontinuitySequenceBase?: number;
  dateRanges: HLSDateRange[];
  defines: HLSDefine[];
};

export type Segment = {
  uri: string;
  duration: number;
  discontinuity?: boolean;
  map?: HLSMap;
  key?: HLSKey;
  programDateTime?: DateTime;
  spliceInfo?: SpliceInfo;
};

export type SpliceInfo = {
  type: "OUT";
  duration?: number;
};
