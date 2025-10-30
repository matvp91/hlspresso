import Hls from "hls.js";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./index.css";

const videoElement = document.getElementById(
  "videoElement",
) as HTMLVideoElement;

const hls = new Hls();
hls.attachMedia(videoElement);
Object.assign(window, { hls });

const appElement = document.getElementById("app") as HTMLDivElement;
const root = createRoot(appElement);

const render = () => {
  root.render(<App hls={hls} />);
  requestAnimationFrame(render);
};
render();

async function run() {
  const { url } = await fetch("http://localhost:3000/api/v1/sessions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
      url: "https://dw9wwx1tf45dj.cloudfront.net/v1/channel/TestChannel1/cmaf.m3u8",
      vast: {
        url: "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&correlator={random}",
      },
      // url: "https://stream.mux.com/v69RSHhFelSm4701snP22dYz2jICy4E4FUyk02rW4gxRM.m3u8",
      // interstitials: [
      //   {
      //     time: 0,
      //     assets: [
      //       {
      //         type: "STATIC",
      //         url: "https://redirector.gvt1.com/api/manifest/hls_variant/id/c88bddc87d00333a/itag/0/source/dclk_video_ads/requiressl/yes/xpc/EgVovf3BOg%3D%3D/hfr/all/acao/yes/ctier/L/playlist_type/DVR/cpn/1N8rWG3jYW5BQ6fO/keepalive/yes/ip/0.0.0.0/ipbits/0/expire/1793286338/sparams/ip,ipbits,expire,id,itag,source,requiressl,xpc,hfr,acao,ctier,playlist_type/signature/03ACADEC2207DD0AFDC3BFA52C515B20A9BC256E.5A7278F757D5BB6B27BCDC4D895B503DCE2B5820/key/ck2/file/index.m3u8",
      //       },
      //     ],
      //   },
      // ],
      // interstitials: [
      //   {
      //     time: 200,
      //     duration: 20,
      //     assets: [
      //       {
      //         type: "VAST",
      //         url: "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&correlator={random}",
      //       },
      //     ],
      //   },
      // ],
      // interstitials: [
      //   {
      //     time: 30,
      //     duration: 5,
      //     assets: [
      //       {
      //         type: "VAST",
      //         url: "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&correlator={random}",
      //       },
      //     ],
      //   },
      //   {
      //     time: 250,
      //     assets: [
      //       {
      //         type: "VAST",
      //         url: "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&correlator={random}",
      //       },
      //     ],
      //   },
      // ],
      // vmap: {
      //   url: "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/vmap_ad_samples&sz=640x480&cust_params=sample_ar%3Dpremidpostpod&ciu_szs=300x250&gdfp_req=1&ad_rule=1&output=vmap&unviewed_position_start=1&env=vp&cmsid=496&vid=short_onecue&correlator={random}",
      // },
    }),
  }).then((response) => response.json());
  hls.loadSource(url);
}

run();
