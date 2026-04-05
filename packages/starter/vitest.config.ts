import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@otp-service/core": resolve(__dirname, "../core/src/index.ts"),
      "@otp-service/provider-email-resend": resolve(__dirname, "../provider-email-resend/src/index.ts"),
      "@otp-service/provider-sms-twilio": resolve(__dirname, "../provider-sms-twilio/src/index.ts"),
      "@otp-service/redis-store": resolve(__dirname, "../redis-store/src/index.ts")
    }
  },
  test: {
    environment: "node",
    globals: false,
    include: ["test/**/*.test.ts"]
  }
});
