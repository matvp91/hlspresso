import { createRouter } from "..";
import * as handlers from "./out.handlers";
import * as routes from "./out.routes";

const router = createRouter()
  .openapi(routes.main, handlers.main)
  .openapi(routes.media, handlers.media)
  .openapi(routes.assetList, handlers.assetList);

export default router;
