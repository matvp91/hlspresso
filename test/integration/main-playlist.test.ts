import fetchMock from "fetch-mock";
import { describe, expect, test } from "vitest";
import { app } from "../../src/app";
import { createSession } from "./helpers";

describe("GET /out/:sessionId/main.m3u8", () => {
  describe("playlist processing", () => {
    test("rewrites and filters playlist URLs", async () => {
      const createResponse = await createSession({
        url: "https://origin.test/main.m3u8",
        filter: { height: "<= 720", unstable_disableForcedText: true },
      });
      const data = await createResponse.json();
      fetchMock.getOnce(
        "https://origin.test/main.m3u8",
        `
        #EXTM3U
        #EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="audio",NAME="English",URI="audio.m3u8"
        #EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="text",NAME="English",DEFAULT=YES,AUTOSELECT=YES,URI="text.m3u8"
        #EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=1280x720,AUDIO="audio",SUBTITLES="text"
        video.m3u8
        #EXT-X-STREAM-INF:BANDWIDTH=2560000,RESOLUTION=1920x1080
        hd.m3u8`,
      );

      const response = await app.request(data.url);
      const playlist = await response.text();

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/vnd.apple.mpegurl",
      );
      expect(playlist).toContain("type:VIDEO");
      expect(playlist).toContain("type:AUDIO");
      expect(playlist).toContain("type:SUBTITLES");
      expect(playlist).toContain("DEFAULT=NO,AUTOSELECT=NO");
      expect(playlist).not.toContain("1920x1080");
    });
  });

  describe("errors", () => {
    test("returns a missing-session error", async () => {
      const response = await app.request(
        "http://hlspresso.test/out/missing/main.m3u8",
      );
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error.code).toBe("SESSION_NOT_FOUND");
    });

    test.each([
      [503, "FETCH_ORIGIN_FAILED"],
      ["not a playlist", "INVALID_ORIGIN_PLAYLIST"],
      ["#EXTM3U", "INVALID_ORIGIN_PLAYLIST"],
    ])("handles an unusable origin %#", async (result, code) => {
      const createResponse = await createSession({
        url: "https://origin.test/main.m3u8",
      });
      const data = await createResponse.json();
      fetchMock.get("https://origin.test/main.m3u8", result);

      const response = await app.request(data.url);
      const error = await response.json();

      expect(response.status).toBe(502);
      expect(error.error.code).toBe(code);
    });
  });

  describe("VMAP", () => {
    test("returns a VMAP fetch error", async () => {
      const createResponse = await createSession({
        url: "https://origin.test/main.m3u8",
        vmap: { url: "https://ads.test/vmap.xml" },
      });
      const data = await createResponse.json();
      fetchMock.get("https://ads.test/vmap.xml", 503);

      const response = await app.request(data.url);
      const error = await response.json();

      expect(response.status).toBe(502);
      expect(error.error.code).toBe("FETCH_VMAP_FAILED");
    });
  });
});
