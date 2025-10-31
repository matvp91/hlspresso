import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { parseMainPlaylist } from "../../src/parser/hls";

const dirName = path.dirname(fileURLToPath(import.meta.url));

describe("Main playlist", () => {
  test.each([
    "Main_Basic.m3u8",
    "Main_Characteristics.m3u8",
    "Main_GroupedVariants.m3u8",
    "Main_IFrame.m3u8",
    "Main_AlternativeAudio.m3u8",
  ])("Parses %s", (name) => {
    const data = fs.readFileSync(`${dirName}/data/${name}`, "utf8");
    expect(parseMainPlaylist(data)).toMatchSnapshot();
  });
});
