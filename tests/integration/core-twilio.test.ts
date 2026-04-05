import { describe, expect, it } from "vitest";

import { createOtpService, hmacOtpSigner } from "../../packages/core/src/index.js";
import { createTwilioSmsProvider, type TwilioHttpClient } from "../../packages/provider-sms-twilio/src/index.js";
import { InMemoryChallengeStore, createDeterministicOtpGenerator, createFixedClock } from "../../packages/testkit/src/index.js";

describe("core + twilio provider integration", () => {
  it("sends OTPs through the Twilio provider while keeping hashed state in the store", async () => {
    const httpClient = new RecordingTwilioHttpClient();
    const service = createOtpService({
      challengeIdGenerator: () => "challenge-twilio",
      clock: createFixedClock("2026-04-04T10:00:00.000Z"),
      delivery: createTwilioSmsProvider({
        accountSid: "AC123",
        authToken: "auth-token",
        from: "+15550000000",
        httpClient
      }),
      otpGenerator: (length) => {
        const generator = createDeterministicOtpGenerator(["123456"]);
        const otp = generator.nextOtp();
        expect(otp).toHaveLength(length);
        return otp;
      },
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "twilio-secret" }),
      store: new InMemoryChallengeStore()
    });

    const result = await service.generateChallenge({
      channel: "sms",
      purpose: "LOGIN",
      recipient: "+15551234567"
    });

    expect(result.status).toBe("CHALLENGE_CREATED");
    expect(httpClient.requests[0]?.body).toContain("Body=Your+LOGIN+OTP+is+123456.");
  });
});

class RecordingTwilioHttpClient implements TwilioHttpClient {
  readonly requests: Array<{ body: string; url: string }> = [];

  post(
    url: string,
    input: {
      body: URLSearchParams;
      headers: Record<string, string>;
    }
  ) {
    void input.headers;
    this.requests.push({
      body: input.body.toString(),
      url
    });

    return Promise.resolve({
      json: () => Promise.resolve({ sid: "SM123" }),
      status: 201
    });
  }
}
