import type { z } from "@hono/zod-openapi";
import type { DateTime } from "luxon";
import type { createSessionParamsSchema } from "./schema";

export type CreateSessionParams = z.infer<typeof createSessionParamsSchema>;

export interface Session {
  id: string;
  startTime: DateTime;
  mainUrl: string;
  events: TimedEvent[];
}

export interface Asset {
  url: string;
  duration: number;
}

export interface TimedEvent {
  dateTime: DateTime;
  duration?: number;
  assets?: Asset[];
}

export type ValueOf<T> = T[keyof T];

// biome-ignore lint/suspicious/noExplicitAny: Intended
export type IntendedAny = any;
