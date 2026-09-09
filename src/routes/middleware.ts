import type { KVNamespace } from "@cloudflare/workers-types";
import { getRuntimeKey } from "hono/adapter";
import { createMiddleware } from "hono/factory";
import graceful from "node-graceful";
import { getEnv } from "../env";
import { ApiError } from "../error";
import type { AppEnv } from ".";

export type AppKv = {
  set(key: string, value: string, ttl: number): Promise<void>;
  get(key: string): Promise<string | null>;
};

// Keep a reference to the kv in case we're in node,
// this'll avoid creating kv on each request.
let appKv: AppKv | undefined;

export const appData = createMiddleware<AppEnv>(async (c, next) => {
  const runtimeKey = getRuntimeKey();
  const params = getEnv(c);

  c.set("params", params);

  if (!appKv) {
    if (runtimeKey === "workerd" && c.env.hlspresso) {
      appKv = createWorkerdKv(c.env.hlspresso);
    } else if (params.REDIS_URL) {
      try {
        appKv = await createRedisKv(params.REDIS_URL);
      } catch (cause) {
        throw sessionStoreUnavailable(cause);
      }
    }

    appKv = withSessionStoreErrors(appKv ?? createMemoryKv());
  }

  c.set("kv", appKv);
  await next();
});

export function createMemoryKv(): AppKv {
  const values = new Map<string, { value: string; expiresAt: number }>();

  return {
    async set(key, value, ttl) {
      values.set(key, { value, expiresAt: Date.now() + ttl * 1000 });
    },
    async get(key) {
      const stored = values.get(key);
      if (!stored) {
        return null;
      }
      if (stored.expiresAt <= Date.now()) {
        values.delete(key);
        return null;
      }
      return stored.value;
    },
  };
}

function withSessionStoreErrors(kv: AppKv): AppKv {
  return {
    async set(key, value, ttl) {
      try {
        await kv.set(key, value, ttl);
      } catch (cause) {
        throw sessionStoreUnavailable(cause);
      }
    },
    async get(key) {
      try {
        return await kv.get(key);
      } catch (cause) {
        throw sessionStoreUnavailable(cause);
      }
    },
  };
}

function sessionStoreUnavailable(cause: unknown) {
  return new ApiError({
    code: "SESSION_STORE_UNAVAILABLE",
    message: "The session store is temporarily unavailable.",
    cause,
  });
}

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
