import { describe, expect, it } from "vitest";

import { createOtpService, hmacOtpSigner } from "../../packages/core/src/index.js";
import {
  InMemoryChallengeStore,
  RecordingDelivery,
  createDeterministicOtpGenerator,
  createFixedClock
} from "../../packages/testkit/src/index.js";

describe("core + testkit integration", () => {
  it("supports deterministic end-to-end OTP flows without real providers", async () => {
    const store = new InMemoryChallengeStore();
    const delivery = new RecordingDelivery();
    const generator = createDeterministicOtpGenerator(["123456"]);

    const service = createOtpService({
      challengeIdGenerator: () => "challenge-testkit",
      clock: createFixedClock("2026-04-04T10:00:00.000Z"),
      delivery,
      otpGenerator: (length) => {
        const otp = generator.nextOtp();
        expect(otp).toHaveLength(length);
        return otp;
      },
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "testkit-secret" }),
      store
    });

    const challenge = await service.generateChallenge({
      channel: "sms",
      purpose: "LOGIN",
      recipient: "+15551234567"
    });

    expect(delivery.lastRequest().otp).toBe("123456");
    expect(store.mustGet("challenge-testkit").otpHash).not.toBe("123456");

    await expect(
      service.verifyChallenge({
        challengeId: challenge.challengeId,
        otp: "123456"
      })
    ).resolves.toEqual({
      challengeId: "challenge-testkit",
      status: "VERIFIED"
    });
  });
});
