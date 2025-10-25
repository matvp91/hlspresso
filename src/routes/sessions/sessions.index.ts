import { OpenAPIHono } from "@hono/zod-openapi";
import * as handlers from "./sessions.handlers";
import * as routes from "./sessions.routes";

const router = new OpenAPIHono().openapi(routes.create, handlers.create);

export default router;
