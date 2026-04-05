import {
  createOtpService,
  hmacOtpSigner,
  type CreateOtpServiceOptions,
  type OtpPolicy,
  type OtpService
} from "@otp-service/core";
import {
  createResendEmailProvider,
  type CreateResendEmailProviderOptions
} from "@otp-service/provider-email-resend";
import {
  createTwilioSmsProvider,
  type CreateTwilioSmsProviderOptions
} from "@otp-service/provider-sms-twilio";
import {
  createRedisChallengeStore,
  type CreateRedisChallengeStoreOptions,
  type RedisStoreClient
} from "@otp-service/redis-store";

export const DEFAULT_OTP_POLICY: OtpPolicy = {
  maxVerifyAttempts: 3,
  otpLength: 6,
  ttlSeconds: 600
};

export interface StarterOtpOptionsBase {
  challengeIdGenerator?: CreateOtpServiceOptions["challengeIdGenerator"];
  clock?: CreateOtpServiceOptions["clock"];
  otpGenerator?: CreateOtpServiceOptions["otpGenerator"];
  policy?: Partial<OtpPolicy>;
  redis: {
    client: RedisStoreClient;
    keyPrefix?: string;
  };
  signerSecret: string;
}

export interface CreateTwilioSmsOtpServiceOptions extends StarterOtpOptionsBase {
  twilio: Omit<CreateTwilioSmsProviderOptions, "httpClient"> & {
    httpClient: CreateTwilioSmsProviderOptions["httpClient"];
  };
}

export interface CreateResendEmailOtpServiceOptions extends StarterOtpOptionsBase {
  resend: Omit<CreateResendEmailProviderOptions, "httpClient"> & {
    httpClient: CreateResendEmailProviderOptions["httpClient"];
  };
}

export function createTwilioSmsOtpService(
  options: CreateTwilioSmsOtpServiceOptions
): OtpService {
  return createOtpService({
    ...toOptionalOtpServiceOverrides(options),
    delivery: createTwilioSmsProvider(options.twilio),
    policy: resolvePolicy(options.policy),
    signer: hmacOtpSigner({ secret: options.signerSecret }),
    store: createRedisChallengeStore(toRedisStoreOptions(options))
  });
}

export function createResendEmailOtpService(
  options: CreateResendEmailOtpServiceOptions
): OtpService {
  return createOtpService({
    ...toOptionalOtpServiceOverrides(options),
    delivery: createResendEmailProvider(options.resend),
    policy: resolvePolicy(options.policy),
    signer: hmacOtpSigner({ secret: options.signerSecret }),
    store: createRedisChallengeStore(toRedisStoreOptions(options))
  });
}

export function resolvePolicy(policy: Partial<OtpPolicy> = {}): OtpPolicy {
  return {
    maxVerifyAttempts: policy.maxVerifyAttempts ?? DEFAULT_OTP_POLICY.maxVerifyAttempts,
    otpLength: policy.otpLength ?? DEFAULT_OTP_POLICY.otpLength,
    ttlSeconds: policy.ttlSeconds ?? DEFAULT_OTP_POLICY.ttlSeconds
  };
}

export {
  createOtpService,
  hmacOtpSigner,
  createRedisChallengeStore,
  createResendEmailProvider,
  createTwilioSmsProvider
};

export { OtpDeliveryError } from "@otp-service/core";

export type {
  ChallengeRecord,
  ChallengeStore,
  CreateOtpServiceOptions,
  DeliveryRequest,
  GenerateChallengeInput,
  GenerateChallengeResult,
  OtpChannel,
  OtpDelivery,
  OtpPolicy,
  OtpService,
  OtpSigner,
  VerifyChallengeInput,
  VerifyChallengeResult
} from "@otp-service/core";
export type {
  CreateRedisChallengeStoreOptions,
  RedisStoreClient
} from "@otp-service/redis-store";
export type {
  CreateTwilioSmsProviderOptions,
  TwilioHttpClient,
  TwilioHttpResponse
} from "@otp-service/provider-sms-twilio";
export type {
  CreateResendEmailProviderOptions,
  ResendHttpClient,
  ResendHttpResponse
} from "@otp-service/provider-email-resend";

function toOptionalOtpServiceOverrides(
  options: StarterOtpOptionsBase
): Pick<CreateOtpServiceOptions, "challengeIdGenerator" | "clock" | "otpGenerator"> {
  return {
    ...(options.challengeIdGenerator
      ? { challengeIdGenerator: options.challengeIdGenerator }
      : {}),
    ...(options.clock ? { clock: options.clock } : {}),
    ...(options.otpGenerator ? { otpGenerator: options.otpGenerator } : {})
  };
}

function toRedisStoreOptions(
  options: StarterOtpOptionsBase
): CreateRedisChallengeStoreOptions {
  return {
    client: options.redis.client,
    ...(options.clock ? { clock: options.clock } : {}),
    ...(options.redis.keyPrefix ? { keyPrefix: options.redis.keyPrefix } : {})
  };
}
