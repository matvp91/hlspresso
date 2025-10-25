import type { Context } from "hono";
import { env } from "hono/adapter";
import { z } from "zod";

const envSchema = z.object({
  REDIS_URL: z.string().optional(),
  BASE_URL: z.string(),
  SECRET: z.string(),
});

export type Env = z.infer<typeof envSchema>;

export function createEnv(c: Context) {
  return envSchema.parse(env(c));
}
