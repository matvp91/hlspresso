import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    setupFiles: ["./test/setup.ts"],
  },
  resolve: {
    alias: {
      "extern/vast-client": fileURLToPath(
        new URL("./extern/vast-client/index.mjs", import.meta.url),
      ),
    },
  },
});
