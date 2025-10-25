import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import out from "./routes/out/out.index";
import outSession from "./routes/out/session/out.session.index";
import sessions from "./routes/sessions/sessions.index";

export const app = new OpenAPIHono();

app.use(cors());

const routes = [sessions, out, outSession];
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
