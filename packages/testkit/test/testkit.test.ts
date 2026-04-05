import { describe, expect, it } from "vitest";

import type { ChallengeRecord } from "@otp-service/core";

import {
  InMemoryChallengeStore,
  RecordingDelivery,
  createDeterministicOtpGenerator,
  createFixedClock
} from "../src/index.js";

describe("@otp-service/testkit", () => {
  it("stores and retrieves challenge records through the in-memory store", async () => {
    const store = new InMemoryChallengeStore();
    const record = exampleRecord();

    await store.create(record);

    expect(await store.get("challenge-123")).toEqual(record);
    expect(store.mustGet("challenge-123")).toEqual(record);
    expect(store.list()).toEqual([record]);
  });

  it("records delivery requests and exposes the latest request", async () => {
    const delivery = new RecordingDelivery();

    await delivery.sendChallenge({
      challengeId: "challenge-123",
      channel: "sms",
      expiresAt: new Date("2026-04-04T10:10:00.000Z"),
      otp: "123456",
      purpose: "LOGIN",
      recipient: "+15551234567"
    });

    expect(delivery.requests).toHaveLength(1);
    expect(delivery.lastRequest()).toEqual({
      challengeId: "challenge-123",
      channel: "sms",
      expiresAt: new Date("2026-04-04T10:10:00.000Z"),
      otp: "123456",
      purpose: "LOGIN",
      recipient: "+15551234567"
    });
  });

  it("provides deterministic OTP values and fails when exhausted", () => {
    const generator = createDeterministicOtpGenerator(["123456", "654321"]);

    expect(generator.nextOtp()).toBe("123456");
    expect(generator.remaining()).toEqual(["654321"]);
    expect(generator.nextOtp()).toBe("654321");
    expect(() => generator.nextOtp()).toThrow(
      "Deterministic OTP generator ran out of values."
    );
  });

  it("creates a stable test clock from an ISO timestamp", () => {
    const clock = createFixedClock("2026-04-04T10:00:00.000Z");

    expect(clock()).toEqual(new Date("2026-04-04T10:00:00.000Z"));
    expect(clock()).not.toBe(clock());
  });
});

function exampleRecord(): ChallengeRecord {
  return {
    attemptsRemaining: 3,
    channel: "sms",
    challengeId: "challenge-123",
    createdAt: new Date("2026-04-04T10:00:00.000Z"),
    expiresAt: new Date("2026-04-04T10:10:00.000Z"),
    otpHash: "hashed-otp",
    purpose: "LOGIN",
    recipient: "+15551234567"
  };
}
