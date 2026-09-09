import fetchMock from "fetch-mock";
import { DateTime } from "luxon";
import { describe, expect, test } from "vitest";
import { app } from "../../src/app";
import { assetListPayloadSchema, mediaPayloadSchema } from "../../src/schema";
import { createSession } from "./helpers";

describe("GET /out/:sessionId/:payload/asset-list.json", () => {
  test("returns an empty list when no interstitial matches", async () => {
    const createResponse = await createSession({
      url: "https://origin.test/main.m3u8",
    });
    const session = await createResponse.json();
    const payload = assetListPayloadSchema.encode({ dateTime: DateTime.now() });

    const response = await app.request(
      `http://hlspresso.test/out/${session.id}/${payload}/asset-list.json`,
    );
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({ ASSETS: [] });
  });

  describe("static assets", () => {
    test("returns a static asset with its resolved duration", async () => {
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
        #EXT-X-TARGETDURATION:10
        #EXTINF:10
        ad.ts
        #EXT-X-ENDLIST`,
      );
      const createResponse = await createSession({
        url: "https://origin.test/main.m3u8",
        interstitials: [
          {
            time: 0,
            assets: [{ type: "STATIC", url: "https://ads.test/main.m3u8" }],
          },
        ],
      });
      const session = await createResponse.json();
      const mediaPayload = mediaPayloadSchema.encode({
        type: "VIDEO",
        path: "video.m3u8",
      });
      fetchMock.getOnce(
        "https://origin.test/video.m3u8",
        `
        #EXTM3U
        #EXT-X-TARGETDURATION:10
        #EXTINF:10
        one.ts
        #EXT-X-ENDLIST`,
      );
      const mediaResponse = await app.request(
        `http://hlspresso.test/out/${session.id}/media/${mediaPayload}/playlist.m3u8`,
      );
      const media = await mediaResponse.text();
      const assetPath = media.match(/X-ASSET-LIST="([^"]+)"/)?.[1];

      const response = await app.request(
        new URL(assetPath ?? "", "http://hlspresso.test"),
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({
        ASSETS: [{ URI: "https://ads.test/main.m3u8", DURATION: 10 }],
      });
    });
  });

  describe("validation", () => {
    test("rejects a malformed asset-list payload", async () => {
      const response = await app.request(
        "http://hlspresso.test/out/session/not-rison/asset-list.json",
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error.code).toBe("INVALID_REQUEST");
    });
  });

  describe("VAST", () => {
    test("resolves an HLS creative", async () => {
      const createResponse = await createSession({
        url: "https://origin.test/main.m3u8",
        vast: { url: "https://ads.test/vast.xml" },
      });
      const session = await createResponse.json();
      const payload = assetListPayloadSchema.encode({
        dateTime: DateTime.now(),
      });
      fetchMock.getOnce(
        "https://ads.test/vast.xml",
        `
          <VAST version="3.0">
            <Ad id="ad-1">
              <InLine>
                <AdSystem>test</AdSystem>
                <AdTitle>Test</AdTitle>
                <Impression>https://track.test/impression</Impression>
                <Creatives>
                  <Creative>
                    <Linear>
                      <Duration>00:00:10</Duration>
                      <MediaFiles>
                        <MediaFile type="application/x-mpegURL">https://ads.test/ad.m3u8</MediaFile>
                      </MediaFiles>
                    </Linear>
                  </Creative>
                </Creatives>
              </InLine>
            </Ad>
          </VAST>`,
      );

      const response = await app.request(
        `http://hlspresso.test/out/${session.id}/${payload}/asset-list.json`,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.ASSETS).toEqual([
        { URI: "https://ads.test/ad.m3u8", DURATION: 10 },
      ]);
    });

    test("ignores creatives without HLS media", async () => {
      const createResponse = await createSession({
        url: "https://origin.test/main.m3u8",
        vast: { url: "https://ads.test/vast.xml" },
      });
      const session = await createResponse.json();
      const payload = assetListPayloadSchema.encode({
        dateTime: DateTime.now(),
      });
      fetchMock.getOnce(
        "https://ads.test/vast.xml",
        `
          <VAST version="3.0">
            <Ad id="ad-1">
              <InLine>
                <AdSystem>test</AdSystem>
                <AdTitle>Test</AdTitle>
                <Impression>https://track.test/impression</Impression>
                <Creatives>
                  <Creative>
                    <Linear>
                      <Duration>00:00:10</Duration>
                      <MediaFiles>
                        <MediaFile type="video/mp4">https://ads.test/ad.mp4</MediaFile>
                      </MediaFiles>
                    </Linear>
                  </Creative>
                </Creatives>
              </InLine>
            </Ad>
          </VAST>`,
      );

      const response = await app.request(
        `http://hlspresso.test/out/${session.id}/${payload}/asset-list.json`,
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ ASSETS: [] });
    });

    test("returns an error when VAST cannot be fetched", async () => {
      const createResponse = await createSession({
        url: "https://origin.test/main.m3u8",
        vast: { url: "https://ads.test/vast.xml" },
      });
      const session = await createResponse.json();
      const payload = assetListPayloadSchema.encode({
        dateTime: DateTime.now(),
      });
      fetchMock.get("https://ads.test/vast.xml", 503);

      const response = await app.request(
        `http://hlspresso.test/out/${session.id}/${payload}/asset-list.json`,
      );
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.error.code).toBe("FETCH_VAST_FAILED");
    });
  });
});
