import type {
  ChallengeRecord,
  ChallengeStore,
  DeliveryRequest,
  OtpDelivery
} from "@otp-service/core";

export class InMemoryChallengeStore implements ChallengeStore {
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

  list(): ChallengeRecord[] {
    return Array.from(this.records.values(), (record) => structuredClone(record));
  }

  mustGet(challengeId: string): ChallengeRecord {
    const record = this.records.get(challengeId);
    if (record === undefined) {
      throw new Error(`Missing challenge ${challengeId}`);
    }

    return structuredClone(record);
  }

  reset(): void {
    this.records.clear();
  }

  update(record: ChallengeRecord): Promise<void> {
    this.records.set(record.challengeId, structuredClone(record));
    return Promise.resolve();
  }
}

export class RecordingDelivery implements OtpDelivery {
  readonly requests: DeliveryRequest[] = [];

  sendChallenge(request: DeliveryRequest): Promise<void> {
    this.requests.push(structuredClone(request));
    return Promise.resolve();
  }

  lastRequest(): DeliveryRequest {
    const request = this.requests.at(-1);
    if (request === undefined) {
      throw new Error("No delivery requests were recorded.");
    }

    return structuredClone(request);
  }

  reset(): void {
    this.requests.length = 0;
  }
}

export interface DeterministicOtpGenerator {
  nextOtp(): string;
  remaining(): string[];
  reset(): void;
}

export function createDeterministicOtpGenerator(
  values: readonly string[]
): DeterministicOtpGenerator {
  if (values.length === 0) {
    throw new Error("Deterministic OTP generator requires at least one OTP value.");
  }

  let index = 0;

  return {
    nextOtp() {
      const value = values[index];
      if (value === undefined) {
        throw new Error("Deterministic OTP generator ran out of values.");
      }

      index += 1;
      return value;
    },
    remaining() {
      return [...values.slice(index)];
    },
    reset() {
      index = 0;
    }
  };
}

export function createFixedClock(isoDate: string): () => Date {
  const fixed = new Date(isoDate);
  if (Number.isNaN(fixed.getTime())) {
    throw new Error("Fixed clock requires a valid ISO date.");
  }

  return () => new Date(fixed.getTime());
}
