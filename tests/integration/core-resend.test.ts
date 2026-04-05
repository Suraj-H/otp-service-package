import { describe, expect, it } from "vitest";

import { createOtpService, hmacOtpSigner } from "../../packages/core/src/index.js";
import { createResendEmailProvider, type ResendHttpClient } from "../../packages/provider-email-resend/src/index.js";
import { InMemoryChallengeStore, createDeterministicOtpGenerator, createFixedClock } from "../../packages/testkit/src/index.js";

describe("core + resend provider integration", () => {
  it("sends OTPs through the Resend provider while keeping hashed state in the store", async () => {
    const httpClient = new RecordingResendHttpClient();
    const generator = createDeterministicOtpGenerator(["123456"]);
    const store = new InMemoryChallengeStore();
    const service = createOtpService({
      challengeIdGenerator: () => "challenge-resend",
      clock: createFixedClock("2026-04-04T10:00:00.000Z"),
      delivery: createResendEmailProvider({
        apiKey: "re_test_key",
        from: "otp@example.com",
        httpClient
      }),
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
      signer: hmacOtpSigner({ secret: "resend-secret" }),
      store
    });

    const result = await service.generateChallenge({
      channel: "email",
      purpose: "VERIFY_EMAIL",
      recipient: "alice@example.com"
    });

    expect(result.status).toBe("CHALLENGE_CREATED");
    expect(httpClient.requests[0]?.body).toContain("\"text\":\"Your VERIFY_EMAIL OTP is 123456.");
    expect(store.mustGet("challenge-resend").otpHash).not.toBe("123456");
  });
});

class RecordingResendHttpClient implements ResendHttpClient {
  readonly requests: Array<{ body: string; url: string }> = [];

  post(
    url: string,
    input: {
      body: string;
      headers: Record<string, string>;
    }
  ) {
    void input.headers;
    this.requests.push({
      body: input.body,
      url
    });

    return Promise.resolve({
      json: () => Promise.resolve({ id: "email_123" }),
      status: 200
    });
  }
}
