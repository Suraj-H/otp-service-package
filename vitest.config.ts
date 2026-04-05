import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@nestjs/common": resolve(__dirname, "node_modules/@nestjs/common/index.js"),
      "@nestjs/core": resolve(__dirname, "node_modules/@nestjs/core/index.js"),
      "@nestjs/testing": resolve(__dirname, "node_modules/@nestjs/testing/index.js"),
      "@otp-service/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@otp-service/express": resolve(__dirname, "packages/express/src/index.ts"),
      "@otp-service/fastify": resolve(__dirname, "packages/fastify/src/index.ts"),
      "@otp-service/nest": resolve(__dirname, "packages/nest/src/index.ts"),
      "@otp-service/provider-email-resend": resolve(__dirname, "packages/provider-email-resend/src/index.ts"),
      "@otp-service/provider-sms-twilio": resolve(__dirname, "packages/provider-sms-twilio/src/index.ts"),
      "@otp-service/redis-store": resolve(__dirname, "packages/redis-store/src/index.ts"),
      "@otp-service/starter": resolve(__dirname, "packages/starter/src/index.ts"),
      "@otp-service/testkit": resolve(__dirname, "packages/testkit/src/index.ts"),
      fastify: resolve(__dirname, "node_modules/fastify/fastify.js"),
      "reflect-metadata": resolve(__dirname, "node_modules/reflect-metadata/Reflect.js"),
      rxjs: resolve(__dirname, "node_modules/rxjs/dist/cjs/index.js")
    }
  },
  test: {
    environment: "node",
    globals: false,
    include: [
      "packages/*/test/**/*.test.ts",
      "tests/**/*.test.ts"
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "lcov", "html"],
      reportsDirectory: "./coverage",
      include: ["packages/*/src/**/*.ts"],
      exclude: [
        "**/*.test.ts",
        "**/dist/**",
        "**/node_modules/**",
        "examples/**",
        "tests/**",
        "tooling/**",
        "scripts/**"
      ]
    }
  }
});
