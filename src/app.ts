import { Scalar } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { handleApiError } from "./error";
import { createRouter } from "./routes";
import out from "./routes/out/out.index";
import sessions from "./routes/sessions/sessions.index";

export const app = createRouter();

app.use(cors());

app.onError((err, c) => {
  // Log the error to console, we'd want to know what's going on.
  console.error(err);
  const { error, status } = handleApiError(err);
  return c.json(error, status as ContentfulStatusCode);
});

const routes = [sessions, out];
for (const route of routes) {
  app.route("/", route);
}

app.get("/api/v1/doc", (c) => {
  const doc = app.getOpenAPIDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "HLSpresso",
      description:
        "A lightweight HLS proxy that can insert interstitials on the fly. Supports live streams with CUE-IN and CUE-OUT markers and VOD with precise insertion points. Provides VMAP and VAST support, playlist filtering and modification, and can run at the edge or on serverless platforms like Cloudflare Workers and AWS Lambda.",
      license: {
        name: "MIT",
      },
    },
    tags: [
      {
        name: "Session",
        description:
          "Captures all your playback activity in a single session, including progress, interactions, and viewing history, for a personalized experience.",
      },
    ],
  });
  return c.json(doc);
});

app.get("/v1/docs", Scalar({ url: "/api/v1/doc" }));

app.openAPIRegistry.registerComponent("schemas", "URLParams", {
  type: "object",
  description:
    "Parameters that will be replaced when providing a VAST or VMAP url.",
  properties: {
    "{random}": {
      description: "Replace with a random number.",
      example: "https://ad-server.com/vast.xml?id={random}",
    },
    "{userAgent}": {
      description: "Replace with the user agent string of the end user.",
      example: "https://ad-server.com/vmap.xml?ua={userAgent}",
    },
  },
});
