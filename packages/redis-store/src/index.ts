import type { ChallengeRecord, ChallengeStore, OtpChannel } from "@otp-service/core";

export interface RedisStoreClient {
  del(key: string): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { expiration: { type: "EX"; value: number } }): Promise<unknown>;
}

export interface CreateRedisChallengeStoreOptions {
  client: RedisStoreClient;
  clock?: () => Date;
  keyPrefix?: string;
}

interface SerializedChallengeRecord {
  attemptsRemaining: number;
  channel: OtpChannel;
  challengeId: string;
  createdAt: string;
  expiresAt: string;
  otpHash: string;
  purpose: string;
  recipient: string;
}

export function createRedisChallengeStore(
  options: CreateRedisChallengeStoreOptions
): ChallengeStore {
  const clock = options.clock ?? (() => new Date());
  const keyPrefix = options.keyPrefix ?? "otp:challenge";

  return {
    async create(record) {
      await options.client.set(toRedisKey(keyPrefix, record.challengeId), serializeRecord(record), {
        expiration: {
          type: "EX",
          value: ttlSecondsFrom(record.expiresAt, clock)
        }
      });
    },

    async delete(challengeId) {
      await options.client.del(toRedisKey(keyPrefix, challengeId));
    },

    async get(challengeId) {
      const value = await options.client.get(toRedisKey(keyPrefix, challengeId));
      if (value === null) {
        return null;
      }

      return deserializeRecord(value);
    },

    async update(record) {
      const ttlSeconds = ttlSecondsFrom(record.expiresAt, clock);
      if (ttlSeconds <= 0) {
        await options.client.del(toRedisKey(keyPrefix, record.challengeId));
        return;
      }

      await options.client.set(toRedisKey(keyPrefix, record.challengeId), serializeRecord(record), {
        expiration: {
          type: "EX",
          value: ttlSeconds
        }
      });
    }
  };
}

function deserializeRecord(value: string): ChallengeRecord {
  let parsed: unknown;

  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Redis challenge record contains invalid JSON.");
  }

  assertSerializedChallengeRecord(parsed);

  return {
    attemptsRemaining: parsed.attemptsRemaining,
    channel: parsed.channel,
    challengeId: parsed.challengeId,
    createdAt: new Date(parsed.createdAt),
    expiresAt: new Date(parsed.expiresAt),
    otpHash: parsed.otpHash,
    purpose: parsed.purpose,
    recipient: parsed.recipient
  };
}

function assertSerializedChallengeRecord(value: unknown): asserts value is SerializedChallengeRecord {
  if (typeof value !== "object" || value === null) {
    throw new Error("Redis challenge record must be an object.");
  }

  const record = value as Record<string, unknown>;

  if (!Number.isInteger(record.attemptsRemaining)) {
    throw new Error("Redis challenge record attemptsRemaining must be an integer.");
  }

  if (record.channel !== "sms" && record.channel !== "email") {
    throw new Error("Redis challenge record channel is invalid.");
  }

  const stringFields = ["challengeId", "createdAt", "expiresAt", "otpHash", "purpose", "recipient"] as const;

  for (const field of stringFields) {
    const fieldValue = record[field];
    if (typeof fieldValue !== "string" || fieldValue.trim().length === 0) {
      throw new Error(`Redis challenge record ${field} must be a non-empty string.`);
    }
  }

  if (Number.isNaN(new Date(record.createdAt as string).getTime())) {
    throw new Error("Redis challenge record createdAt must be a valid ISO date string.");
  }

  if (Number.isNaN(new Date(record.expiresAt as string).getTime())) {
    throw new Error("Redis challenge record expiresAt must be a valid ISO date string.");
  }
}

function serializeRecord(record: ChallengeRecord): string {
  return JSON.stringify({
    attemptsRemaining: record.attemptsRemaining,
    channel: record.channel,
    challengeId: record.challengeId,
    createdAt: record.createdAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
    otpHash: record.otpHash,
    purpose: record.purpose,
    recipient: record.recipient
  } satisfies SerializedChallengeRecord);
}

function toRedisKey(keyPrefix: string, challengeId: string): string {
  return `${keyPrefix}:${challengeId}`;
}

function ttlSecondsFrom(expiresAt: Date, clock: () => Date): number {
  const millisecondsRemaining = expiresAt.getTime() - clock().getTime();
  return Math.max(0, Math.ceil(millisecondsRemaining / 1000));
}
