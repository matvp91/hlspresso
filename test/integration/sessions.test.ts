import fetchMock from "fetch-mock";
import { describe, expect, test } from "vitest";
import { app } from "../../src/app";
import { createSession } from "./helpers";

describe("POST /api/v1/sessions", () => {
  describe("creation", () => {
    test("creates a session", async () => {
      const response = await createSession({
        url: "https://origin.test/main.m3u8",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toEqual(expect.any(String));
      expect(data.url).toBe(`http://hlspresso.test/out/${data.id}/main.m3u8`);
    });

    test("prefixes the session id with its group", async () => {
      const response = await createSession({
        url: "https://origin.test/main.m3u8",
        group: "customer",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.id).toMatch(/^customer:/);
    });
  });

  describe("validation", () => {
    test.each([
      [{}, "url"],
      [{ url: "not-a-url" }, "url"],
      [{ url: "ftp://origin.test/main.m3u8" }, "url"],
      [{ url: "https://origin.test/main.m3u8", unexpected: true }, undefined],
      [
        {
          url: "https://origin.test/main.m3u8",
          filter: { height: "large" },
        },
        "filter.height",
      ],
      [
        {
          url: "https://origin.test/main.m3u8",
          interstitials: [{ time: -1 }],
        },
        "interstitials.0.time",
      ],
    ])("rejects invalid session parameters %#", async (params, field) => {
      const response = await createSession(params);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
      if (field) {
        expect(data.error.details).toContainEqual({
          field,
          message: expect.any(String),
        });
      }
    });

    test("rejects malformed JSON", async () => {
      const response = await app.request(
        "http://hlspresso.test/api/v1/sessions",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        },
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
    });
  });

  describe("static assets", () => {
    test("resolves the duration of a static asset", async () => {
      fetchMock.getOnce(
        "https://ads.test/main.m3u8",
        `
        #EXTM3U
        #EXT-X-STREAM-INF:BANDWIDTH=1280000
        ad.m3u8`,
      );
      fetchMock.getOnce(
        "https://ads.test/ad.m3u8",
        `
        #EXTM3U
        #EXT-X-TARGETDURATION:6
        #EXTINF:4
        one.ts
        #EXTINF:6
        two.ts
        #EXT-X-ENDLIST`,
      );

      const response = await createSession({
        url: "https://origin.test/main.m3u8",
        interstitials: [
          {
            time: 0,
            assets: [{ type: "STATIC", url: "https://ads.test/main.m3u8" }],
          },
        ],
      });

      expect(response.status).toBe(200);
      expect(fetchMock.callHistory.calls()).toHaveLength(2);
    });

    test.each([
      [503, "FETCH_STATIC_ASSET_FAILED"],
      ["not a playlist", "INVALID_STATIC_ASSET_PLAYLIST"],
      ["#EXTM3U", "INVALID_STATIC_ASSET_PLAYLIST"],
    ])("handles an unusable static main playlist %#", async (result, code) => {
      fetchMock.get("https://ads.test/main.m3u8", result);

      const response = await createSession({
        url: "https://origin.test/main.m3u8",
        interstitials: [
          {
            time: 0,
            assets: [{ type: "STATIC", url: "https://ads.test/main.m3u8" }],
          },
        ],
      });
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error.code).toBe(code);
    });
  });
});
