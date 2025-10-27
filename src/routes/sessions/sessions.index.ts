import { createRouter } from "..";
import * as handlers from "./sessions.handlers";
import * as routes from "./sessions.routes";

const router = createRouter().openapi(routes.create, handlers.create);

export default router;
