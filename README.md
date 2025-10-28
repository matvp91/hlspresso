# HLSpresso

A lightweight HLS proxy that can insert HLS interstitials on the fly.

We host an example at https://hlspresso.green-mode-c2f7.workers.dev/v1/docs, feel free to toy with it.

- VOD with precise insertion points, manual or VMAP.
- VAST (up to 6) support.
- Playlist filtering and modification, on the fly.
- Can run at the edge or on serverless platforms like Cloudflare Workers and AWS Lambda.
- Live streams with CUE-IN and CUE-OUT markers for ad replacement.
- Ad Creative Signaling (SVTA2053-2) spec.

## API

Create a personalized HLS playlist for each playback session by sending a `POST` request to `/api/v1/sessions`.

```sh
POST https://my-domain.com/api/v1/sessions
```

```js
{
  "url": "https://foo.bar/main.m3u8",
  "interstitials": [
    {
      "time": 0,
      "type": "STATIC",
      "url": "https://foo.bar/bumpers/intro.m3u8"
    }
  ]
}
```

You can also use a VAST URL instead of a static asset. In the example below, a midroll is inserted at position 10, serving one or more ads fetched from the VAST URL. To try it out, you can use an [IMA sample tag](https://developers.google.com/interactive-media-ads/docs/sdks/html5/client-side/tags).

```js
{
  "url": "https://foo.bar/main.m3u8",
  "interstitials": [
    {
      "time": 10,
      "type": "VAST",
      "url": "https://pubads.g.doubleclick.net/gampad/ads?iu=/external/single_ad_sample&sz=640x480"
    }
  ]
}
```

Alternatively, you could derive the interstitials from a VMAP response rather than defining each one manually.

```js
{
  "url": "https://foo.bar/main.m3u8",
  "vmap": {
    "url": "https://pubads.g.doubleclick.net/gampad/ads?iu=/external/vmap"
  }
}
```
