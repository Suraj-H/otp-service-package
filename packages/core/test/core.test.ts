import { describe, expect, it } from "vitest";

import {
  createOtpService,
  hmacOtpSigner,
  type ChallengeRecord,
  type ChallengeStore,
  type DeliveryRequest,
  OtpDeliveryError,
  type OtpDelivery
} from "../src/index.js";

describe("@otp-service/core", () => {
  it("creates a challenge, stores only the OTP hash, and sends the plaintext OTP only to the delivery layer", async () => {
    const store = new InMemoryChallengeStore();
    const delivery = new RecordingDelivery();
    const service = createOtpService({
      challengeIdGenerator: () => "challenge-123",
      clock: () => new Date("2026-04-04T10:00:00.000Z"),
      delivery,
      otpGenerator: () => "123456",
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "top-secret" }),
      store
    });

    const result = await service.generateChallenge({
      channel: "sms",
      purpose: "LOGIN",
      recipient: "+15551234567"
    });

    const storedRecord = store.mustGet("challenge-123");

    expect(result).toEqual({
      challengeId: "challenge-123",
      expiresAt: new Date("2026-04-04T10:10:00.000Z"),
      status: "CHALLENGE_CREATED"
    });
    expect(storedRecord.otpHash).not.toBe("123456");
    expect("otp" in storedRecord).toBe(false);
    expect(Object.values(storedRecord)).not.toContain("123456");
    expect(delivery.requests).toEqual([
      {
        challengeId: "challenge-123",
        channel: "sms",
        expiresAt: new Date("2026-04-04T10:10:00.000Z"),
        otp: "123456",
        purpose: "LOGIN",
        recipient: "+15551234567"
      }
    ]);
  });

  it("verifies a valid OTP and deletes the stored challenge", async () => {
    const store = new InMemoryChallengeStore();
    const service = createOtpService({
      delivery: new RecordingDelivery(),
      otpGenerator: () => "123456",
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "top-secret" }),
      store
    });

    const challenge = await service.generateChallenge({
      channel: "email",
      purpose: "VERIFY_EMAIL",
      recipient: "alice@example.com"
    });

    const result = await service.verifyChallenge({
      challengeId: challenge.challengeId,
      otp: "123456"
    });

    expect(result).toEqual({
      challengeId: challenge.challengeId,
      status: "VERIFIED"
    });
    expect(await store.get(challenge.challengeId)).toBeNull();
  });

  it("returns INVALID for an incorrect OTP and decrements attempts", async () => {
    const store = new InMemoryChallengeStore();
    const service = createOtpService({
      challengeIdGenerator: () => "challenge-456",
      delivery: new RecordingDelivery(),
      otpGenerator: () => "123456",
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "top-secret" }),
      store
    });

    await service.generateChallenge({
      channel: "sms",
      purpose: "LOGIN",
      recipient: "+15557654321"
    });

    const result = await service.verifyChallenge({
      challengeId: "challenge-456",
      otp: "000000"
    });

    expect(result).toEqual({
      attemptsRemaining: 2,
      challengeId: "challenge-456",
      status: "INVALID"
    });
    expect(store.mustGet("challenge-456").attemptsRemaining).toBe(2);
  });

  it("returns ATTEMPTS_EXCEEDED when the final verification attempt fails", async () => {
    const store = new InMemoryChallengeStore();
    const service = createOtpService({
      challengeIdGenerator: () => "challenge-789",
      delivery: new RecordingDelivery(),
      otpGenerator: () => "123456",
      policy: {
        maxVerifyAttempts: 1,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "top-secret" }),
      store
    });

    await service.generateChallenge({
      channel: "sms",
      purpose: "LOGIN",
      recipient: "+15559876543"
    });

    const result = await service.verifyChallenge({
      challengeId: "challenge-789",
      otp: "000000"
    });

    expect(result).toEqual({
      challengeId: "challenge-789",
      status: "ATTEMPTS_EXCEEDED"
    });
    expect(store.mustGet("challenge-789").attemptsRemaining).toBe(0);
  });

  it("returns EXPIRED for expired challenges and removes them from storage", async () => {
    const store = new InMemoryChallengeStore();
    const service = createOtpService({
      challengeIdGenerator: () => "challenge-expired",
      clock: () => new Date("2026-04-04T10:00:00.000Z"),
      delivery: new RecordingDelivery(),
      otpGenerator: () => "123456",
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 1
      },
      signer: hmacOtpSigner({ secret: "top-secret" }),
      store
    });

    await service.generateChallenge({
      channel: "email",
      purpose: "RESET_PASSWORD",
      recipient: "bob@example.com"
    });

    const expiredService = createOtpService({
      clock: () => new Date("2026-04-04T10:00:02.000Z"),
      delivery: new RecordingDelivery(),
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 1
      },
      signer: hmacOtpSigner({ secret: "top-secret" }),
      store
    });

    const result = await expiredService.verifyChallenge({
      challengeId: "challenge-expired",
      otp: "123456"
    });

    expect(result).toEqual({
      challengeId: "challenge-expired",
      status: "EXPIRED"
    });
    expect(await store.get("challenge-expired")).toBeNull();
  });

  it("deletes the stored challenge when delivery fails definitively", async () => {
    const store = new InMemoryChallengeStore();
    const service = createOtpService({
      challengeIdGenerator: () => "challenge-definitive-failure",
      delivery: new FailingDelivery(
        new OtpDeliveryError({
          code: "SMS_DELIVERY_FAILED",
          deliveryOutcome: "DEFINITIVE_FAILURE",
          message: "Twilio rejected the request.",
          provider: "twilio",
          retryable: false
        })
      ),
      otpGenerator: () => "123456",
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "top-secret" }),
      store
    });

    await expect(
      service.generateChallenge({
        channel: "sms",
        purpose: "LOGIN",
        recipient: "+15551234567"
      })
    ).rejects.toMatchObject({
      code: "SMS_DELIVERY_FAILED",
      deliveryOutcome: "DEFINITIVE_FAILURE"
    });

    expect(await store.get("challenge-definitive-failure")).toBeNull();
  });

  it("preserves the stored challenge when delivery outcome is ambiguous", async () => {
    const store = new InMemoryChallengeStore();
    const service = createOtpService({
      challengeIdGenerator: () => "challenge-ambiguous-failure",
      delivery: new FailingDelivery(
        new OtpDeliveryError({
          code: "SMS_DELIVERY_TRANSPORT_ERROR",
          deliveryOutcome: "OUTCOME_UNKNOWN",
          message: "Network timed out before acceptance was confirmed.",
          provider: "twilio",
          retryable: true
        })
      ),
      otpGenerator: () => "123456",
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "top-secret" }),
      store
    });

    await expect(
      service.generateChallenge({
        channel: "sms",
        purpose: "LOGIN",
        recipient: "+15551234567"
      })
    ).rejects.toMatchObject({
      code: "SMS_DELIVERY_TRANSPORT_ERROR",
      deliveryOutcome: "OUTCOME_UNKNOWN"
    });

    expect(store.mustGet("challenge-ambiguous-failure").otpHash).not.toBe("123456");
  });

  it("rejects invalid generateChallenge runtime input with stable errors", async () => {
    const service = createOtpService({
      delivery: new RecordingDelivery(),
      otpGenerator: () => "123456",
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "top-secret" }),
      store: new InMemoryChallengeStore()
    });

    await expect(
      service.generateChallenge({
        channel: "push" as never,
        purpose: "LOGIN",
        recipient: "+15551234567"
      })
    ).rejects.toThrow("Challenge channel must be either sms or email.");

    await expect(
      service.generateChallenge({
        channel: "sms",
        purpose: 42 as never,
        recipient: "+15551234567"
      })
    ).rejects.toThrow("Challenge purpose must not be empty.");

    await expect(
      service.generateChallenge({
        channel: "sms",
        purpose: "LOGIN",
        recipient: null as never
      })
    ).rejects.toThrow("Challenge recipient must not be empty.");
  });

  it("rejects invalid verifyChallenge runtime input with stable errors", async () => {
    const service = createOtpService({
      delivery: new RecordingDelivery(),
      otpGenerator: () => "123456",
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "top-secret" }),
      store: new InMemoryChallengeStore()
    });

    await expect(
      service.verifyChallenge({
        challengeId: 123 as never,
        otp: "123456"
      })
    ).rejects.toThrow("Challenge ID must not be empty.");

    await expect(
      service.verifyChallenge({
        challengeId: "challenge-123",
        otp: {} as never
      })
    ).rejects.toThrow("OTP input must not be empty.");
  });
});

class InMemoryChallengeStore implements ChallengeStore {
  private readonly records = new Map<string, ChallengeRecord>();

  create(record: ChallengeRecord): Promise<void> {
    this.records.set(record.challengeId, structuredClone(record));
    return Promise.resolve();
  }

  delete(challengeId: string): Promise<void> {
    this.records.delete(challengeId);
    return Promise.resolve();
  }

  get(challengeId: string): Promise<ChallengeRecord | null> {
    const record = this.records.get(challengeId);
    return Promise.resolve(record ? structuredClone(record) : null);
  }

  mustGet(challengeId: string): ChallengeRecord {
    const record = this.records.get(challengeId);
    if (record === undefined) {
      throw new Error(`Missing challenge ${challengeId}`);
    }

    return structuredClone(record);
  }

  update(record: ChallengeRecord): Promise<void> {
    this.records.set(record.challengeId, structuredClone(record));
    return Promise.resolve();
  }
}

class RecordingDelivery implements OtpDelivery {
  readonly requests: DeliveryRequest[] = [];

  sendChallenge(request: DeliveryRequest): Promise<void> {
    this.requests.push(structuredClone(request));
    return Promise.resolve();
  }
}

class FailingDelivery implements OtpDelivery {
  constructor(private readonly error: Error) {}

  sendChallenge(request: DeliveryRequest): Promise<void> {
    void request;
    return Promise.reject(this.error);
  }
}
