import { OpenAPIHono } from "@hono/zod-openapi";
import { cors } from "hono/cors";
import outAssetList from "./routes/[get]out-asset-list";
import outMain from "./routes/[get]out-main";
import outMedia from "./routes/[get]out-media";
import postSessions from "./routes/[post]sessions";

export const app = new OpenAPIHono();

app.use(cors());

app.openapi(postSessions.route, postSessions.handler);
app.openapi(outAssetList.route, outAssetList.handler);
app.openapi(outMain.route, outMain.handler);
app.openapi(outMedia.route, outMedia.handler);

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
