import type { KVNamespace } from "@cloudflare/workers-types";
import { z } from "@hono/zod-openapi";
import { env, getRuntimeKey } from "hono/adapter";
import { createMiddleware } from "hono/factory";
import graceful from "node-graceful";
import type { AppEnv } from ".";
import { assert } from "../assert";

const paramsSchema = z.object({
  REDIS_URL: z.string().optional(),
  BASE_URL: z.string().optional(),
});

export type AppParams = z.infer<typeof paramsSchema>;

export type AppKv = {
  set(key: string, value: string, ttl: number): Promise<void>;
  get(key: string): Promise<string | null>;
};

// Keep a reference to the kv in case we're in node,
// this'll avoid creating kv on each request.
let appKv: AppKv | undefined;

export const appData = createMiddleware<AppEnv>(async (c, next) => {
  const runtimeKey = getRuntimeKey();

  const params = paramsSchema.parse(env(c));

  // Create params.
  c.set("params", params);

  if (!appKv) {
    // We have no appKv, try and create one.
    if (runtimeKey === "workerd") {
      assert(c.env.hlspresso, "Missing workerd kv");
      appKv = createWorkerdKv(c.env.hlspresso);
    } else if (params.REDIS_URL) {
      appKv = await createRedisKv(params.REDIS_URL);
    }
  }
  if (appKv) {
    c.set("kv", appKv);
  } else {
    throw new Error("Could not create a KV store.");
  }

  await next();
});

function createWorkerdKv(kv: KVNamespace): AppKv {
  return {
    async set(key, value, ttl) {
      await kv.put(key, value, {
        expirationTtl: ttl,
      });
    },
    async get(key) {
      return await kv.get(key);
    },
  };
}

async function createRedisKv(url: string): Promise<AppKv> {
  const { createClient } = await import("redis");

  const client = createClient({
    url,
  });
  await client.connect();

  graceful.on("exit", async () => {
    await client.quit();
  });

  return {
    async set(key, value, ttl) {
      await client.set(key, value, {
        expiration: {
          type: "EX",
          value: ttl,
        },
      });
    },
    async get(key) {
      return await client.get(key);
    },
  };
}
