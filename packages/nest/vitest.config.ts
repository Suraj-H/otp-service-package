import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@nestjs/common": resolve(__dirname, "../../node_modules/@nestjs/common/index.js"),
      "@nestjs/core": resolve(__dirname, "../../node_modules/@nestjs/core/index.js"),
      "@nestjs/testing": resolve(__dirname, "../../node_modules/@nestjs/testing/index.js"),
      "@otp-service/core": resolve(__dirname, "../core/src/index.ts"),
      "@otp-service/testkit": resolve(__dirname, "../testkit/src/index.ts"),
      "reflect-metadata": resolve(__dirname, "../../node_modules/reflect-metadata/Reflect.js"),
      rxjs: resolve(__dirname, "../../node_modules/rxjs/dist/cjs/index.js")
    }
  },
  test: {
    environment: "node",
    globals: false,
    include: ["test/**/*.test.ts"]
  }
});
