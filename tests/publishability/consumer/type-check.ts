import { OtpDeliveryError, createOtpService, hmacOtpSigner, type OtpPolicy } from "@otp-service/core";
import { createGenerateChallengeHandler as createExpressGenerateHandler } from "@otp-service/express";
import { createGenerateChallengeHandler as createFastifyGenerateHandler } from "@otp-service/fastify";
import { OTP_SERVICE_TOKEN, createNestOtpModule } from "@otp-service/nest";
import { createResendEmailProvider } from "@otp-service/provider-email-resend";
import { createTwilioSmsProvider } from "@otp-service/provider-sms-twilio";
import { createRedisChallengeStore, type RedisStoreClient } from "@otp-service/redis-store";
import {
  DEFAULT_OTP_POLICY,
  createResendEmailOtpService,
  createTwilioSmsOtpService
} from "@otp-service/starter";
import { InMemoryChallengeStore, RecordingDelivery, createDeterministicOtpGenerator } from "@otp-service/testkit";

const policy: OtpPolicy = {
  maxVerifyAttempts: DEFAULT_OTP_POLICY.maxVerifyAttempts,
  otpLength: DEFAULT_OTP_POLICY.otpLength,
  ttlSeconds: DEFAULT_OTP_POLICY.ttlSeconds
};

const store = new InMemoryChallengeStore();
const delivery = new RecordingDelivery();
const generator = createDeterministicOtpGenerator(["123456"]);
const otpService = createOtpService({
  delivery,
  otpGenerator: () => generator.nextOtp(),
  policy,
  signer: hmacOtpSigner({ secret: "publishability-secret" }),
  store
});

createExpressGenerateHandler({ otpService });
createFastifyGenerateHandler({ otpService });
createNestOtpModule({ otpService });

const redisClient: RedisStoreClient = {
  del: () => Promise.resolve(1),
  get: () => Promise.resolve(null),
  set: () => Promise.resolve("OK")
};

createRedisChallengeStore({ client: redisClient });

createTwilioSmsProvider({
  accountSid: "AC123",
  authToken: "auth-token",
  from: "+15550000000",
  httpClient: {
    post: () =>
      Promise.resolve({
        json: () => Promise.resolve({ sid: "SM123" }),
        status: 201
      })
  }
});

createResendEmailProvider({
  apiKey: "re_test",
  from: "no-reply@example.com",
  httpClient: {
    post: () =>
      Promise.resolve({
        json: () => Promise.resolve({ id: "email_123" }),
        status: 200
      })
  }
});

createTwilioSmsOtpService({
  redis: { client: redisClient },
  signerSecret: "starter-secret",
  twilio: {
    accountSid: "AC123",
    authToken: "auth-token",
    from: "+15550000000",
    httpClient: {
      post: () =>
        Promise.resolve({
          json: () => Promise.resolve({ sid: "SM123" }),
          status: 201
        })
    }
  }
});

createResendEmailOtpService({
  redis: { client: redisClient },
  resend: {
    apiKey: "re_test",
    from: "no-reply@example.com",
    httpClient: {
      post: () =>
        Promise.resolve({
          json: () => Promise.resolve({ id: "email_123" }),
          status: 200
        })
    }
  },
  signerSecret: "starter-secret"
});

const token = OTP_SERVICE_TOKEN;
const error = new OtpDeliveryError({
  code: "CODE",
  deliveryOutcome: "DEFINITIVE_FAILURE",
  message: "message",
  provider: "provider",
  retryable: false
});

void token;
void error;
