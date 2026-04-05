import "reflect-metadata";

import { Module } from "@nestjs/common";
import type { DynamicModule } from "@nestjs/common";

import { createOtpService, hmacOtpSigner } from "@otp-service/core";
import { createNestOtpModule, createOtpController, type NestOtpControllerClass } from "@otp-service/nest";
import { InMemoryChallengeStore, RecordingDelivery, createDeterministicOtpGenerator } from "@otp-service/testkit";

export interface CreateExampleNestAppOptions {
  otpValues?: readonly string[];
}

export interface ExampleNestApp {
  controller: NestOtpControllerClass;
  delivery: RecordingDelivery;
  module: DynamicModule;
}

export function createExampleNestApp(options: CreateExampleNestAppOptions = {}): ExampleNestApp {
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

  const controller = createOtpController();
  const otpModule = createNestOtpModule({ otpService });
  otpModule.controllers = [controller];

  @Module({
    imports: [otpModule]
  })
  class ExampleAppModule {}

  return {
    controller,
    delivery,
    module: {
      imports: [otpModule],
      module: ExampleAppModule
    }
  };
}
