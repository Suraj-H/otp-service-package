import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@otp-service/core": resolve(__dirname, "../core/src/index.ts")
    }
  },
  test: {
    environment: "node",
    globals: false,
    include: ["test/**/*.test.ts"]
  }
});
