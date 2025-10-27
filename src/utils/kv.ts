import type { KVNamespace } from "@cloudflare/workers-types";
import type { Context } from "hono";
import { getRuntimeKey } from "hono/adapter";
import graceful from "node-graceful";
import { assert } from "../assert";
import type { Env } from "./env";

export interface Kv {
  set(key: string, value: string, ttl: number): Promise<void>;
  get(key: string): Promise<string | null>;
}

const WORKERD_KV_BINDING = "hlspresso";

function createWorkerdKv(kv: KVNamespace): Kv {
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

async function createRedisKv(url: string): Promise<Kv> {
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

function createMemoryKv(): Kv {
  const store = new Map();
  return {
    async set(key, value) {
      store.set(key, value);
    },
    async get(key) {
      return store.get(key);
    },
  };
}

// Keep a reference to the kv in case we're in node,
// this'll avoid creating kv on each request.
let kv: Kv | null = null;

export async function createKv(
  c: Context<{
    Bindings: {
      [WORKERD_KV_BINDING]?: KVNamespace;
    };
  }>,
  env: Env,
): Promise<Kv> {
  if (kv) {
    return kv;
  }

  const runtimeKey = getRuntimeKey();

  if (runtimeKey === "workerd") {
    assert(c.env[WORKERD_KV_BINDING], "Missing workerd kv");
    kv = createWorkerdKv(c.env[WORKERD_KV_BINDING]);
  }
  if (env.REDIS_URL) {
    kv = await createRedisKv(env.REDIS_URL);
  }
  if (!kv) {
    kv = createMemoryKv();
  }

  return kv;
}
