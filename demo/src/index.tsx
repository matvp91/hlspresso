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
      url: "https://c4da7516d609d1a79f5550ea917bea0e.p05sqb.channel-assembly.mediatailor.us-west-2.amazonaws.com/v1/channel/TestChannel1/cmaf.m3u8",
      vast: {
        url: "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&correlator={random}",
      },
    }),
  }).then((response) => response.json());
  hls.loadSource(url);
}

run();
