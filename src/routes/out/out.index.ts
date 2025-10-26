import { OpenAPIHono } from "@hono/zod-openapi";
import * as handlers from "./out.handlers";
import * as routes from "./out.routes";

const router = new OpenAPIHono()
  .openapi(routes.main, handlers.main)
  .openapi(routes.media, handlers.media)
  .openapi(routes.interstitial, handlers.interstitial);

export default router;
