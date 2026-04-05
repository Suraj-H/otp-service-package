import { strict as assert } from "node:assert";

const expectations = [
  {
    exports: ["createOtpService", "hmacOtpSigner"],
    name: "@otp-service/core"
  },
  {
    exports: ["createGenerateChallengeHandler", "createVerifyChallengeHandler"],
    name: "@otp-service/express"
  },
  {
    exports: ["createGenerateChallengeHandler", "createVerifyChallengeHandler", "fastifyOtpErrorHandler"],
    name: "@otp-service/fastify"
  },
  {
    exports: ["OTP_SERVICE_TOKEN", "createNestOtpModule", "createOtpController"],
    name: "@otp-service/nest"
  },
  {
    exports: ["createResendEmailProvider"],
    name: "@otp-service/provider-email-resend"
  },
  {
    exports: ["createTwilioSmsProvider"],
    name: "@otp-service/provider-sms-twilio"
  },
  {
    exports: ["createRedisChallengeStore"],
    name: "@otp-service/redis-store"
  },
  {
    exports: ["DEFAULT_OTP_POLICY", "createResendEmailOtpService", "createTwilioSmsOtpService"],
    name: "@otp-service/starter"
  },
  {
    exports: ["InMemoryChallengeStore", "RecordingDelivery", "createDeterministicOtpGenerator"],
    name: "@otp-service/testkit"
  }
];

for (const expectation of expectations) {
  const moduleNamespace = await import(expectation.name);

  for (const exportName of expectation.exports) {
    assert.ok(
      exportName in moduleNamespace,
      `${expectation.name} is missing runtime export ${exportName}.`
    );
  }
}

console.log(`Verified runtime imports for ${expectations.length} packages from the consumer fixture.`);
