# hlspresso

A lightweight HLS proxy that can insert interstitials on the fly. Supports live streams with CUE-IN and CUE-OUT markers and VOD with precise insertion points. Provides VMAP and VAST support, playlist filtering and modification, and can run at the edge or on serverless platforms like Cloudflare Workers and AWS Lambda.

Create a personalized HLS playlist for each playback session by sending a `POST` request to `/api/v1/sessions`.

```json
{
  "url": "https://foo.bar/main.m3u8",
  "interstitials": [
    {
      "time": 0,
      "type": "STATIC",
      "url": "https://foo.bar/bumpers/intro.m3u8"
    },
    // and / or
    {
      "time": 0,
      "type": "VAST",
      // Test it out with a Google IMA sample tag:
      // https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/tags
      "url": "https://pubads.g.doubleclick.net/gampad/ads?iu=/external/single_ad_sample&sz=640x480"
    }
  ]
}
```

```json
{
  "url": "https://foo.bar/main.m3u8",
  "vmap": {
    "url": "https://pubads.g.doubleclick.net/gampad/ads?iu=/external/vmap"
  }
}
```