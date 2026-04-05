import { describe, expect, it } from "vitest";

import {
  DEFAULT_OTP_POLICY,
  createResendEmailOtpService,
  createTwilioSmsOtpService,
  resolvePolicy
} from "../src/index.js";

describe("@otp-service/starter", () => {
  it("creates a Twilio + Redis backed OTP service with safe default policy", async () => {
    const redis = new MemoryRedisClient();
    const twilio = new RecordingTwilioHttpClient();
    const service = createTwilioSmsOtpService({
      challengeIdGenerator: () => "starter-sms",
      clock: () => new Date("2026-04-04T10:00:00.000Z"),
      otpGenerator: () => "123456",
      redis: {
        client: redis,
        keyPrefix: "starter"
      },
      signerSecret: "starter-secret",
      twilio: {
        accountSid: "AC123",
        authToken: "auth-token",
        from: "+15550000000",
        httpClient: twilio
      }
    });

    const challenge = await service.generateChallenge({
      channel: "sms",
      purpose: "LOGIN",
      recipient: "+15551234567"
    });

    expect(challenge).toEqual({
      challengeId: "starter-sms",
      expiresAt: new Date("2026-04-04T10:10:00.000Z"),
      status: "CHALLENGE_CREATED"
    });
    expect(redis.lastSetKey).toBe("starter:starter-sms");
    const persisted = JSON.parse(redis.lastSetValue ?? "{}") as Record<string, unknown>;
    expect(persisted.otpHash).not.toBe("123456");
    expect("otp" in persisted).toBe(false);
    expect(twilio.lastRequestBody?.get("To")).toBe("+15551234567");
    expect(twilio.lastRequestBody?.get("Body")).toContain("123456");

    await expect(
      service.verifyChallenge({
        challengeId: "starter-sms",
        otp: "123456"
      })
    ).resolves.toEqual({
      challengeId: "starter-sms",
      status: "VERIFIED"
    });
  });

  it("creates a Resend + Redis backed OTP service and respects policy overrides", async () => {
    const redis = new MemoryRedisClient();
    const resend = new RecordingResendHttpClient();
    const service = createResendEmailOtpService({
      challengeIdGenerator: () => "starter-email",
      clock: () => new Date("2026-04-04T10:00:00.000Z"),
      otpGenerator: () => "654321",
      policy: {
        ttlSeconds: 120
      },
      redis: {
        client: redis
      },
      resend: {
        apiKey: "re_test",
        from: "no-reply@example.com",
        httpClient: resend
      },
      signerSecret: "starter-secret"
    });

    const challenge = await service.generateChallenge({
      channel: "email",
      purpose: "RESET_PASSWORD",
      recipient: "alice@example.com"
    });

    expect(challenge.expiresAt).toEqual(new Date("2026-04-04T10:02:00.000Z"));
    expect(redis.lastExpirationSeconds).toBe(120);
    expect(resend.lastPayload).toMatchObject({
      from: "no-reply@example.com",
      subject: "RESET_PASSWORD OTP",
      to: ["alice@example.com"]
    });
    expect(JSON.stringify(resend.lastPayload)).toContain("654321");
  });

  it("resolves policy overrides against the default starter policy", () => {
    expect(DEFAULT_OTP_POLICY).toEqual({
      maxVerifyAttempts: 3,
      otpLength: 6,
      ttlSeconds: 600
    });

    expect(
      resolvePolicy({
        maxVerifyAttempts: 5
      })
    ).toEqual({
      maxVerifyAttempts: 5,
      otpLength: 6,
      ttlSeconds: 600
    });
  });
});

class MemoryRedisClient {
  lastExpirationSeconds: number | null = null;
  lastSetKey: string | null = null;
  lastSetValue: string | null = null;

  private readonly records = new Map<string, string>();

  del(key: string): Promise<number> {
    const deleted = this.records.delete(key);
    return Promise.resolve(deleted ? 1 : 0);
  }

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.records.get(key) ?? null);
  }

  set(
    key: string,
    value: string,
    options: { expiration: { type: "EX"; value: number } }
  ): Promise<unknown> {
    this.lastExpirationSeconds = options.expiration.value;
    this.lastSetKey = key;
    this.lastSetValue = value;
    this.records.set(key, value);
    return Promise.resolve("OK");
  }
}

class RecordingTwilioHttpClient {
  lastRequestBody: URLSearchParams | null = null;

  post(
    _url: string,
    input: {
      body: URLSearchParams;
      headers: Record<string, string>;
    }
  ): Promise<{ json(): Promise<unknown>; status: number }> {
    this.lastRequestBody = input.body;
    return Promise.resolve({
      json: () =>
        Promise.resolve({
          sid: "SM123"
        }),
      status: 201
    });
  }
}

class RecordingResendHttpClient {
  lastPayload: Record<string, unknown> | null = null;

  post(
    _url: string,
    input: {
      body: string;
      headers: Record<string, string>;
    }
  ): Promise<{ json(): Promise<unknown>; status: number }> {
    this.lastPayload = JSON.parse(input.body) as Record<string, unknown>;
    return Promise.resolve({
      json: () =>
        Promise.resolve({
          id: "email_123"
        }),
      status: 200
    });
  }
}
