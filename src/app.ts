import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { handleApiError } from "./error";
import { createRouter } from "./routes";
import out from "./routes/out/out.index";
import sessions from "./routes/sessions/sessions.index";

export const app = createRouter();

app.use(cors());

app.onError((err, c) => {
  const { error, status } = handleApiError(err);
  return c.json(error, status as ContentfulStatusCode);
});

const routes = [sessions, out];
for (const route of routes) {
  app.route("/", route);
}

app.get("/openapi", (c) => {
  const doc = app.getOpenAPIDocument({
    openapi: "3.0.0",
    info: {
      version: "1.0.0",
      title: "hlspresso",
    },
  });
  return c.json(doc);
});
