import { createHmac, randomInt, randomUUID, timingSafeEqual } from "node:crypto";

export type OtpChannel = "email" | "sms";

export interface ChallengeRecord {
  attemptsRemaining: number;
  channel: OtpChannel;
  challengeId: string;
  createdAt: Date;
  expiresAt: Date;
  otpHash: string;
  purpose: string;
  recipient: string;
}

export interface ChallengeStore {
  create(record: ChallengeRecord): Promise<void>;
  delete(challengeId: string): Promise<void>;
  get(challengeId: string): Promise<ChallengeRecord | null>;
  update(record: ChallengeRecord): Promise<void>;
}

export interface DeliveryRequest {
  challengeId: string;
  channel: OtpChannel;
  expiresAt: Date;
  otp: string;
  purpose: string;
  recipient: string;
}

export interface OtpDelivery {
  sendChallenge(request: DeliveryRequest): Promise<void>;
}

export type OtpDeliveryOutcome = "DEFINITIVE_FAILURE" | "OUTCOME_UNKNOWN";

export class OtpDeliveryError extends Error {
  readonly code: string;
  override readonly cause?: unknown;
  readonly deliveryOutcome: OtpDeliveryOutcome;
  readonly provider: string;
  readonly retryable: boolean;

  constructor(input: {
    cause?: unknown;
    code: string;
    deliveryOutcome: OtpDeliveryOutcome;
    message: string;
    provider: string;
    retryable: boolean;
  }) {
    super(input.message);
    this.name = "OtpDeliveryError";
    this.code = input.code;
    this.deliveryOutcome = input.deliveryOutcome;
    this.provider = input.provider;
    this.retryable = input.retryable;
    this.cause = input.cause;
  }
}

export interface OtpSigner {
  hash(otp: string): string;
  verify(otp: string, otpHash: string): boolean;
}

export interface OtpPolicy {
  maxVerifyAttempts: number;
  otpLength: number;
  ttlSeconds: number;
}

export interface CreateOtpServiceOptions {
  challengeIdGenerator?: () => string;
  clock?: () => Date;
  delivery: OtpDelivery;
  otpGenerator?: (length: number) => string;
  policy: OtpPolicy;
  signer: OtpSigner;
  store: ChallengeStore;
}

export interface GenerateChallengeInput {
  channel: OtpChannel;
  purpose: string;
  recipient: string;
}

export interface GenerateChallengeResult {
  challengeId: string;
  expiresAt: Date;
  status: "CHALLENGE_CREATED";
}

export interface VerifyChallengeInput {
  challengeId: string;
  otp: string;
}

export type VerifyChallengeResult =
  | { challengeId: string; status: "VERIFIED" }
  | { attemptsRemaining: number; challengeId: string; status: "INVALID" }
  | { challengeId: string; status: "EXPIRED" }
  | { challengeId: string; status: "ATTEMPTS_EXCEEDED" };

export interface OtpService {
  generateChallenge(input: GenerateChallengeInput): Promise<GenerateChallengeResult>;
  verifyChallenge(input: VerifyChallengeInput): Promise<VerifyChallengeResult>;
}

export function createOtpService(options: CreateOtpServiceOptions): OtpService {
  const clock = options.clock ?? (() => new Date());
  const challengeIdGenerator = options.challengeIdGenerator ?? randomUUID;
  const otpGenerator = options.otpGenerator ?? defaultOtpGenerator;
  const policy = validatePolicy(options.policy);

  return {
    async generateChallenge(input) {
      validateGenerateChallengeInput(input);

      const createdAt = clock();
      const expiresAt = new Date(createdAt.getTime() + policy.ttlSeconds * 1000);
      const challengeId = challengeIdGenerator();
      const otp = otpGenerator(policy.otpLength);
      const record: ChallengeRecord = {
        attemptsRemaining: policy.maxVerifyAttempts,
        challengeId,
        channel: input.channel,
        createdAt,
        expiresAt,
        otpHash: options.signer.hash(otp),
        purpose: input.purpose,
        recipient: input.recipient
      };

      await options.store.create(record);

      try {
        await options.delivery.sendChallenge({
          challengeId,
          channel: input.channel,
          expiresAt,
          otp,
          purpose: input.purpose,
          recipient: input.recipient
        });
      } catch (error) {
        if (error instanceof OtpDeliveryError && error.deliveryOutcome === "DEFINITIVE_FAILURE") {
          await options.store.delete(challengeId);
        }

        throw error;
      }

      return {
        challengeId,
        expiresAt,
        status: "CHALLENGE_CREATED"
      };
    },

    async verifyChallenge(input) {
      validateVerifyChallengeInput(input);

      const record = await options.store.get(input.challengeId);
      if (record === null) {
        return {
          challengeId: input.challengeId,
          status: "EXPIRED"
        };
      }

      if (record.expiresAt.getTime() <= clock().getTime()) {
        await options.store.delete(record.challengeId);
        return {
          challengeId: record.challengeId,
          status: "EXPIRED"
        };
      }

      if (record.attemptsRemaining <= 0) {
        await options.store.delete(record.challengeId);
        return {
          challengeId: record.challengeId,
          status: "ATTEMPTS_EXCEEDED"
        };
      }

      if (options.signer.verify(input.otp, record.otpHash)) {
        await options.store.delete(record.challengeId);
        return {
          challengeId: record.challengeId,
          status: "VERIFIED"
        };
      }

      const attemptsRemaining = record.attemptsRemaining - 1;
      const nextRecord: ChallengeRecord = {
        ...record,
        attemptsRemaining
      };

      if (attemptsRemaining <= 0) {
        await options.store.update(nextRecord);
        return {
          challengeId: record.challengeId,
          status: "ATTEMPTS_EXCEEDED"
        };
      }

      await options.store.update(nextRecord);
      return {
        attemptsRemaining,
        challengeId: record.challengeId,
        status: "INVALID"
      };
    }
  };
}

export function hmacOtpSigner(input: { secret: string }): OtpSigner {
  if (input.secret.trim().length === 0) {
    throw new Error("OTP signer secret must not be empty.");
  }

  return {
    hash(otp) {
      return createHmac("sha256", input.secret).update(otp).digest("hex");
    },
    verify(otp, otpHash) {
      const hashedOtp = createHmac("sha256", input.secret).update(otp).digest("hex");
      const expected = Buffer.from(otpHash, "hex");
      const actual = Buffer.from(hashedOtp, "hex");

      if (expected.length !== actual.length) {
        return false;
      }

      return timingSafeEqual(actual, expected);
    }
  };
}

function defaultOtpGenerator(length: number): string {
  let otp = "";

  for (let index = 0; index < length; index += 1) {
    otp += randomInt(0, 10).toString();
  }

  return otp;
}

function validateGenerateChallengeInput(input: GenerateChallengeInput): void {
  if (input.channel !== "sms" && input.channel !== "email") {
    throw new Error("Challenge channel must be either sms or email.");
  }

  requireNonEmptyString(input.recipient, "Challenge recipient must not be empty.");
  requireNonEmptyString(input.purpose, "Challenge purpose must not be empty.");
}

function validatePolicy(policy: OtpPolicy): OtpPolicy {
  if (!Number.isInteger(policy.maxVerifyAttempts) || policy.maxVerifyAttempts <= 0) {
    throw new Error("OTP policy maxVerifyAttempts must be a positive integer.");
  }

  if (!Number.isInteger(policy.otpLength) || policy.otpLength < 4) {
    throw new Error("OTP policy otpLength must be an integer greater than or equal to 4.");
  }

  if (!Number.isInteger(policy.ttlSeconds) || policy.ttlSeconds <= 0) {
    throw new Error("OTP policy ttlSeconds must be a positive integer.");
  }

  return policy;
}

function validateVerifyChallengeInput(input: VerifyChallengeInput): void {
  requireNonEmptyString(input.challengeId, "Challenge ID must not be empty.");
  requireNonEmptyString(input.otp, "OTP input must not be empty.");
}

function requireNonEmptyString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(message);
  }

  return value.trim();
}
