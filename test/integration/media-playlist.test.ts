import fetchMock from "fetch-mock";
import { describe, expect, test } from "vitest";
import { app } from "../../src/app";
import { mediaPayloadSchema } from "../../src/schema";
import { createSession } from "./helpers";

async function mediaUrl(type: "VIDEO" | "AUDIO" | "SUBTITLES" = "VIDEO") {
  const response = await createSession({
    url: "https://origin.test/main.m3u8",
    interstitials: [{ time: 0, duration: 5 }],
  });
  const data = await response.json();
  const payload = mediaPayloadSchema.encode({ type, path: "video.m3u8" });
  return `http://hlspresso.test/out/${data.id}/media/${payload}/playlist.m3u8`;
}

describe("GET /out/:sessionId/media/:payload/*", () => {
  describe("VOD", () => {
    test("rewrites VOD segment and map URLs", async () => {
      const url = await mediaUrl();
      fetchMock.getOnce(
        "https://origin.test/video.m3u8",
        `
        #EXTM3U
        #EXT-X-TARGETDURATION:10
        #EXT-X-MAP:URI="init.mp4"
        #EXTINF:10
        one.ts
        #EXT-X-ENDLIST`,
      );

      const response = await app.request(url);
      const playlist = await response.text();

      expect(response.status).toBe(200);
      expect(playlist).toContain('#EXT-X-DEFINE:NAME="ORIG_BASE_URL"');
      expect(playlist).toContain("#EXT-X-PROGRAM-DATE-TIME:");
      expect(playlist).toContain("{$ORIG_BASE_URL}init.mp4");
      expect(playlist).toContain("{$ORIG_BASE_URL}one.ts");
      expect(playlist).toContain("#EXT-X-DATERANGE:");
    });
  });

  describe("interstitials", () => {
    test("does not add interstitials to audio playlists", async () => {
      const url = await mediaUrl("AUDIO");
      fetchMock.getOnce(
        "https://origin.test/video.m3u8",
        `
        #EXTM3U
        #EXT-X-TARGETDURATION:10
        #EXTINF:10
        one.aac
        #EXT-X-ENDLIST`,
      );

      const response = await app.request(url);
      const playlist = await response.text();

      expect(response.status).toBe(200);
      expect(playlist).not.toContain("#EXT-X-DATERANGE:");
    });
  });

  describe("live", () => {
    test("preserves timing in a live playlist", async () => {
      const url = await mediaUrl();
      fetchMock.getOnce(
        "https://origin.test/video.m3u8",
        `
        #EXTM3U
        #EXT-X-TARGETDURATION:10
        #EXT-X-MEDIA-SEQUENCE:12
        #EXT-X-PROGRAM-DATE-TIME:2026-01-01T00:00:00Z
        #EXTINF:10
        live.ts`,
      );

      const response = await app.request(url);
      const playlist = await response.text();

      expect(response.status).toBe(200);
      expect(playlist).toContain("#EXT-X-MEDIA-SEQUENCE:12");
      expect(playlist).toMatch(
        /#EXT-X-PROGRAM-DATE-TIME:2026-01-01T\d{2}:00:00\.000[+-]\d{2}:00/,
      );
      expect(playlist).not.toContain("#EXT-X-ENDLIST");
    });
  });

  describe("errors", () => {
    test("rejects a malformed media payload", async () => {
      const response = await app.request(
        "http://hlspresso.test/out/session/media/not-rison/playlist.m3u8",
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
    });

    test.each([
      [503, "FETCH_ORIGIN_FAILED"],
      ["not a playlist", "INVALID_ORIGIN_PLAYLIST"],
    ])("handles an unusable media playlist %#", async (result, code) => {
      const url = await mediaUrl();
      fetchMock.get("https://origin.test/video.m3u8", result);

      const response = await app.request(url);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error.code).toBe(code);
    });
  });
});
