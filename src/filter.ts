import type { MainPlaylist } from "./parser/hls";
import type { Filter } from "./types";

export function filterMainPlaylist(playlist: MainPlaylist, filter: Filter) {
  if (filter.height !== undefined) {
    const [min, max] = parseFilterToRange(filter.height);
    playlist.variants = playlist.variants.filter(
      (variant) =>
        // If we have no height, we'll make it pass.
        !variant.resolution?.height ||
        // If the variant height is within our range.
        (variant.resolution.height >= min && variant.resolution.height <= max),
    );
  }
  if (filter.width !== undefined) {
    const [min, max] = parseFilterToRange(filter.width);
    playlist.variants = playlist.variants.filter(
      (variant) =>
        // If we have no width, we'll make it pass.
        !variant.resolution?.width ||
        // If the variant width is within our range.
        (variant.resolution.width >= min && variant.resolution.width <= max),
    );
  }
  if (filter.unstable_disableForcedText) {
    for (const media of playlist.medias) {
      if (media.type === "SUBTITLES") {
        media.autoSelect = false;
        media.default = false;
      }
    }
  }
}

function parseFilterToRange(input: string): [number, number] {
  let range = parseRange(input);
  if (range) {
    return range;
  }
  range = parseOperatorToRange(input);
  if (range) {
    return range;
  }
  throw new Error(`Failed to parse to range "${input}"`);
}

function parseRange(input: string): [number, number] | null {
  const match = input.match(/^(\d+)-(\d+)$/);
  if (match?.[1] && match[2]) {
    const min = Number.parseInt(match[1]);
    const max = Number.parseInt(match[2]);
    return [min, max];
  }
  return null;
}

function parseOperatorToRange(input: string): [number, number] | null {
  const match = input.match(/(<=?|>=?)\s*(\d+)/);
  if (match?.[2] === undefined) {
    return null;
  }
  const operator = match[1];
  const number = Number.parseInt(match[2]);
  if (operator === "<=") {
    return [0, number];
  }
  if (operator === "<") {
    return [0, number - 1];
  }
  if (operator === ">=") {
    return [number, Number.POSITIVE_INFINITY];
  }
  if (operator === ">") {
    return [number + 1, Number.POSITIVE_INFINITY];
  }
  return null;
}
