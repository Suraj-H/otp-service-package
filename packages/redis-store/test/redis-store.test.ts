import { describe, expect, it } from "vitest";

import type { ChallengeRecord } from "@otp-service/core";

import { createRedisChallengeStore, type RedisStoreClient } from "../src/index.js";

describe("@otp-service/redis-store", () => {
  it("stores a serialized challenge with a Redis TTL derived from expiresAt", async () => {
    const client = new FakeRedisClient();
    const store = createRedisChallengeStore({
      client,
      clock: () => new Date("2026-04-04T10:00:00.000Z")
    });

    await store.create(exampleRecord());

    expect(client.lastSet).toEqual({
      key: "otp:challenge:challenge-123",
      options: {
        expiration: {
          type: "EX",
          value: 600
        }
      },
      value: JSON.stringify({
        attemptsRemaining: 3,
        channel: "sms",
        challengeId: "challenge-123",
        createdAt: "2026-04-04T10:00:00.000Z",
        expiresAt: "2026-04-04T10:10:00.000Z",
        otpHash: "hashed-otp",
        purpose: "LOGIN",
        recipient: "+15551234567"
      })
    });
  });

  it("deserializes a stored challenge record back into domain types", async () => {
    const client = new FakeRedisClient();
    client.data.set(
      "otp:challenge:challenge-123",
      JSON.stringify({
        attemptsRemaining: 2,
        channel: "email",
        challengeId: "challenge-123",
        createdAt: "2026-04-04T10:00:00.000Z",
        expiresAt: "2026-04-04T10:10:00.000Z",
        otpHash: "hashed-otp",
        purpose: "VERIFY_EMAIL",
        recipient: "alice@example.com"
      })
    );

    const store = createRedisChallengeStore({ client });

    await expect(store.get("challenge-123")).resolves.toEqual({
      attemptsRemaining: 2,
      channel: "email",
      challengeId: "challenge-123",
      createdAt: new Date("2026-04-04T10:00:00.000Z"),
      expiresAt: new Date("2026-04-04T10:10:00.000Z"),
      otpHash: "hashed-otp",
      purpose: "VERIFY_EMAIL",
      recipient: "alice@example.com"
    });
  });

  it("deletes the key instead of updating when the challenge has already expired", async () => {
    const client = new FakeRedisClient();
    const store = createRedisChallengeStore({
      client,
      clock: () => new Date("2026-04-04T10:00:02.000Z")
    });

    await store.update(exampleRecord({ expiresAt: new Date("2026-04-04T10:00:01.000Z") }));

    expect(client.deletedKeys).toEqual(["otp:challenge:challenge-123"]);
    expect(client.lastSet).toBeNull();
  });

  it("rejects malformed Redis payloads instead of trusting them", async () => {
    const client = new FakeRedisClient();
    client.data.set("otp:challenge:challenge-123", "{\"challengeId\":123}");

    const store = createRedisChallengeStore({ client });

    await expect(store.get("challenge-123")).rejects.toThrow(
      "Redis challenge record attemptsRemaining must be an integer."
    );
  });
});

class FakeRedisClient implements RedisStoreClient {
  readonly data = new Map<string, string>();
  readonly deletedKeys: string[] = [];
  lastSet: { key: string; options: { expiration: { type: "EX"; value: number } }; value: string } | null = null;

  del(key: string): Promise<number> {
    this.deletedKeys.push(key);
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
    this.data.set(key, value);
    this.lastSet = { key, options, value };
    return Promise.resolve("OK");
  }
}

function exampleRecord(overrides: Partial<ChallengeRecord> = {}): ChallengeRecord {
  return {
    attemptsRemaining: 3,
    channel: "sms",
    challengeId: "challenge-123",
    createdAt: new Date("2026-04-04T10:00:00.000Z"),
    expiresAt: new Date("2026-04-04T10:10:00.000Z"),
    otpHash: "hashed-otp",
    purpose: "LOGIN",
    recipient: "+15551234567",
    ...overrides
  };
}
