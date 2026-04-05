import express from "express";
import type { Express, RequestHandler } from "express";

import { createOtpService, hmacOtpSigner, type OtpService } from "@otp-service/core";
import { createGenerateChallengeHandler, createVerifyChallengeHandler } from "@otp-service/express";
import { InMemoryChallengeStore, RecordingDelivery, createDeterministicOtpGenerator } from "@otp-service/testkit";

export interface CreateExampleExpressAppOptions {
  otpValues?: readonly string[];
}

export interface ExampleExpressApp {
  app: Express;
  delivery: RecordingDelivery;
  generateHandler: RequestHandler;
  otpService: OtpService;
  verifyHandler: RequestHandler;
}

export function createExampleExpressApp(options: CreateExampleExpressAppOptions = {}): ExampleExpressApp {
  const app = express();
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
  const generateHandler = createGenerateChallengeHandler({ otpService });
  const verifyHandler = createVerifyChallengeHandler({ otpService });

  app.use(express.json());
  app.post("/otp/generate", generateHandler);
  app.post("/otp/verify", verifyHandler);
  app.get("/otp/debug/deliveries", (_request, response) => {
    response.json({
      deliveries: delivery.requests
    });
  });

  return {
    app,
    delivery,
    generateHandler,
    otpService,
    verifyHandler
  };
}
