import type { RouteConfig, RouteHandler, z } from "@hono/zod-openapi";
import type { DateTime } from "luxon";
import type { createSessionParamsSchema } from "./schema";

export type CreateSessionParams = z.infer<typeof createSessionParamsSchema>;

export type Asset = {
  dateTime: DateTime;
} & (
  | { type: "URL"; url: string; duration: number }
  | { type: "VAST"; url: string }
  | { type: "VASTDATA"; data: string }
);

export type Session = {
  id: string;
  startTime: DateTime;
  url: string;
  assets: Asset[];
  vmap?: string;
};

export type ValueOf<T> = T[keyof T];

// biome-ignore lint/suspicious/noExplicitAny: Intended
export type IntendedAny = any;

export type AppRouteHandler<R extends RouteConfig> = RouteHandler<R>;
