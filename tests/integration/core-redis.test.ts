import { describe, expect, it } from "vitest";

import { createOtpService, hmacOtpSigner } from "../../packages/core/src/index.js";
import { createRedisChallengeStore, type RedisStoreClient } from "../../packages/redis-store/src/index.js";

describe("core + redis-store integration", () => {
  it("persists challenge state through the Redis adapter and decrements attempts on invalid verification", async () => {
    const client = new FakeRedisClient();
    const store = createRedisChallengeStore({
      client,
      clock: () => new Date("2026-04-04T10:00:00.000Z")
    });

    const service = createOtpService({
      challengeIdGenerator: () => "challenge-redis",
      clock: () => new Date("2026-04-04T10:00:00.000Z"),
      delivery: { sendChallenge: () => Promise.resolve() },
      otpGenerator: () => "123456",
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "redis-secret" }),
      store
    });

    await service.generateChallenge({
      channel: "sms",
      purpose: "LOGIN",
      recipient: "+15551234567"
    });

    const invalidAttempt = await service.verifyChallenge({
      challengeId: "challenge-redis",
      otp: "000000"
    });

    expect(invalidAttempt).toEqual({
      attemptsRemaining: 2,
      challengeId: "challenge-redis",
      status: "INVALID"
    });

    const rawRecord = client.data.get("otp:challenge:challenge-redis");
    expect(rawRecord).toBeDefined();
    const persistedRecord = JSON.parse(rawRecord ?? "{}") as Record<string, unknown>;
    expect("otp" in persistedRecord).toBe(false);
    expect(persistedRecord.otpHash).not.toBe("123456");
  });
});

class FakeRedisClient implements RedisStoreClient {
  readonly data = new Map<string, string>();

  del(key: string): Promise<number> {
    const deleted = this.data.delete(key) ? 1 : 0;
    return Promise.resolve(deleted);
  }

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.data.get(key) ?? null);
  }

  set(
    key: string,
    value: string,
    options: { expiration: { type: "EX"; value: number } }
  ): Promise<unknown> {
    void options;
    this.data.set(key, value);
    return Promise.resolve("OK");
  }
}
