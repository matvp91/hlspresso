import { Scalar } from "@scalar/hono-api-reference";
import { cors } from "hono/cors";
import { requestId } from "hono/request-id";
import { pinoLogger } from "hono-pino";
import { getEnv } from "./env";
import { ApiError, handleApiError } from "./error";
import { createRouter } from "./routes";
import { appData } from "./routes/middleware";
import out from "./routes/out/out.index";
import sessions from "./routes/sessions/sessions.index";

export const app = createRouter();

app.use(cors({ origin: "*", exposeHeaders: ["X-Request-Id"] }));
app.use(requestId());
app.use(
  pinoLogger({
    pino: (c) => ({
      level: getEnv(c).LOG_LEVEL,
    }),
  }),
);
app.use(appData);

app.onError((err, c) => {
  const handled = handleApiError(err, c.var.requestId);
  if (handled.expected) {
    c.var.logger.warn({ err }, "Request failed");
  } else {
    c.var.logger.error({ err }, "Unexpected request failure");
  }
  return c.json(handled.body, handled.status);
});

app.notFound((c) => {
  const handled = handleApiError(
    new ApiError({
      code: "ROUTE_NOT_FOUND",
      message: `No route matches ${c.req.method} ${c.req.path}.`,
    }),
    c.var.requestId,
  );
  return c.json(handled.body, handled.status);
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
    externalDocs: {
      description: "GitHub",
      url: "https://github.com/matvp91/hlspresso",
    },
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
    "{ip}": {
      description: "Replace with the ip of the end user.",
    },
    "{host}": {
      description: "Replace with the host of the end user.",
    },
  },
});
