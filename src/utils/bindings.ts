import type { Context } from "hono";
import { createEnv } from "./env";
import type { Env } from "./env";
import { createKv } from "./kv";
import type { Kv } from "./kv";

export interface Bindings {
  env: Env;
  kv: Kv;
}

export async function getBindings(c: Context): Promise<Bindings> {
  const env = createEnv(c);
  const kv = await createKv(c, env);

  return {
    env,
    kv,
  };
}
