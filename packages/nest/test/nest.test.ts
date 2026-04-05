import "reflect-metadata";

import { UnprocessableEntityException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { createOtpService, hmacOtpSigner } from "@otp-service/core";
import {
  InMemoryChallengeStore,
  RecordingDelivery,
  createDeterministicOtpGenerator,
  createFixedClock
} from "@otp-service/testkit";

import { createNestOtpModule, createOtpController } from "../src/index.js";

describe("@otp-service/nest", () => {
  it("exposes a working Nest module/controller flow for generate and verify", async () => {
    const delivery = new RecordingDelivery();
    const generator = createDeterministicOtpGenerator(["123456"]);
    const otpService = createOtpService({
      challengeIdGenerator: () => "challenge-nest",
      clock: createFixedClock("2026-04-04T10:00:00.000Z"),
      delivery,
      otpGenerator: () => generator.nextOtp(),
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "nest-secret" }),
      store: new InMemoryChallengeStore()
    });

    const ControllerClass = createOtpController();
    const otpModule = createNestOtpModule({ otpService });
    otpModule.controllers = [ControllerClass];

    const moduleRef = await Test.createTestingModule({
      imports: [otpModule]
    }).compile();

    const controller = moduleRef.get(ControllerClass);

    const generateResult = await controller.generateChallenge({
      channel: "sms",
      purpose: "LOGIN",
      recipient: "+15551234567"
    });

    expect(generateResult).toEqual({
      challengeId: "challenge-nest",
      expiresAt: new Date("2026-04-04T10:10:00.000Z"),
      status: "CHALLENGE_CREATED"
    });
    expect(delivery.lastRequest().otp).toBe("123456");

    await expect(
      controller.verifyChallenge({
        challengeId: "challenge-nest",
        otp: "123456"
      })
    ).resolves.toEqual({
      challengeId: "challenge-nest",
      status: "VERIFIED"
    });
  });

  it("throws Nest validation exceptions for malformed request bodies", async () => {
    const otpService = createOtpService({
      delivery: new RecordingDelivery(),
      otpGenerator: () => "123456",
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "nest-secret" }),
      store: new InMemoryChallengeStore()
    });

    const ControllerClass = createOtpController();
    const otpModule = createNestOtpModule({ otpService });
    otpModule.controllers = [ControllerClass];

    const moduleRef = await Test.createTestingModule({
      imports: [otpModule]
    }).compile();

    const controller = moduleRef.get(ControllerClass);

    await expect(
      controller.generateChallenge({
        channel: "push",
        purpose: "LOGIN",
        recipient: "+15551234567"
      })
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
