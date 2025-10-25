import { OpenAPIHono } from "@hono/zod-openapi";
import * as handlers from "./out.handlers";
import * as routes from "./out.routes";

const router = new OpenAPIHono().openapi(routes.assetList, handlers.assetList);

export default router;
