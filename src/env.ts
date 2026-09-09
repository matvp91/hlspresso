import { z } from "@hono/zod-openapi";
import type { Context } from "hono";
import { env as adapterEnv } from "hono/adapter";

const envSchema = z.object({
  REDIS_URL: z.string().optional(),
  BASE_URL: z.string().optional(),
  LOG_LEVEL: z
    .enum(["silent", "fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
});

export type EnvParams = z.infer<typeof envSchema>;

export function getEnv(c: Context): EnvParams {
  return envSchema.parse(adapterEnv(c));
}
