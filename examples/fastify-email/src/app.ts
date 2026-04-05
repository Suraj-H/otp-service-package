import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

import { createOtpService, hmacOtpSigner, type OtpService } from "@otp-service/core";
import {
  createGenerateChallengeHandler,
  createVerifyChallengeHandler,
  fastifyOtpErrorHandler
} from "@otp-service/fastify";
import { InMemoryChallengeStore, RecordingDelivery, createDeterministicOtpGenerator } from "@otp-service/testkit";

export interface CreateExampleFastifyAppOptions {
  otpValues?: readonly string[];
}

export interface ExampleFastifyApp {
  app: FastifyInstance;
  delivery: RecordingDelivery;
  otpService: OtpService;
}

export function createExampleFastifyApp(
  options: CreateExampleFastifyAppOptions = {}
): ExampleFastifyApp {
  const app = Fastify();
  const delivery = new RecordingDelivery();
  const generator = createDeterministicOtpGenerator(options.otpValues ?? ["123456", "654321", "111111"]);
  const otpService = createOtpService({
    challengeIdGenerator: () => crypto.randomUUID(),
    delivery,
    otpGenerator: () => generator.nextOtp(),
    policy: {
      maxVerifyAttempts: 3,
      otpLength: 6,
      ttlSeconds: 600
    },
    signer: hmacOtpSigner({
      secret: process.env.OTP_SECRET ?? "development-secret"
    }),
    store: new InMemoryChallengeStore()
  });

  app.setErrorHandler(fastifyOtpErrorHandler);
  app.post("/otp/generate", createGenerateChallengeHandler({ otpService }));
  app.post("/otp/verify", createVerifyChallengeHandler({ otpService }));
  app.get("/otp/debug/deliveries", () => ({
    deliveries: delivery.requests
  }));

  return {
    app,
    delivery,
    otpService
  };
}
