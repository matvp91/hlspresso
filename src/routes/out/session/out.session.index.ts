import { OpenAPIHono } from "@hono/zod-openapi";
import * as handlers from "./out.session.handlers";
import * as routes from "./out.session.routes";

const router = new OpenAPIHono()
  .openapi(routes.main, handlers.main)
  .openapi(routes.media, handlers.media);

export default router;
