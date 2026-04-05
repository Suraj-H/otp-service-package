import Fastify from "fastify";
import { describe, expect, it } from "vitest";

import { createOtpService, hmacOtpSigner } from "@otp-service/core";
import {
  InMemoryChallengeStore,
  RecordingDelivery,
  createDeterministicOtpGenerator,
  createFixedClock
} from "@otp-service/testkit";

import {
  createGenerateChallengeHandler,
  createVerifyChallengeHandler,
  fastifyOtpErrorHandler
} from "../src/index.js";

describe("@otp-service/fastify", () => {
  it("handles generate and verify flows through Fastify route handlers", async () => {
    const delivery = new RecordingDelivery();
    const generator = createDeterministicOtpGenerator(["123456"]);
    const otpService = createOtpService({
      challengeIdGenerator: () => "challenge-fastify",
      clock: createFixedClock("2026-04-04T10:00:00.000Z"),
      delivery,
      otpGenerator: () => generator.nextOtp(),
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "fastify-secret" }),
      store: new InMemoryChallengeStore()
    });

    const app = Fastify();
    app.setErrorHandler(fastifyOtpErrorHandler);
    app.post("/otp/generate", createGenerateChallengeHandler({ otpService }));
    app.post("/otp/verify", createVerifyChallengeHandler({ otpService }));

    const generateResponse = await app.inject({
      method: "POST",
      payload: {
        channel: "sms",
        purpose: "LOGIN",
        recipient: "+15551234567"
      },
      url: "/otp/generate"
    });

    expect(generateResponse.statusCode).toBe(201);
    expect(generateResponse.json()).toEqual({
      challengeId: "challenge-fastify",
      expiresAt: "2026-04-04T10:10:00.000Z",
      status: "CHALLENGE_CREATED"
    });
    expect(delivery.lastRequest().otp).toBe("123456");

    const verifyResponse = await app.inject({
      method: "POST",
      payload: {
        challengeId: "challenge-fastify",
        otp: "123456"
      },
      url: "/otp/verify"
    });

    expect(verifyResponse.statusCode).toBe(200);
    expect(verifyResponse.json()).toEqual({
      challengeId: "challenge-fastify",
      status: "VERIFIED"
    });
  });

  it("returns 422 for malformed request bodies", async () => {
    const otpService = createOtpService({
      delivery: new RecordingDelivery(),
      otpGenerator: () => "123456",
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "fastify-secret" }),
      store: new InMemoryChallengeStore()
    });

    const app = Fastify();
    app.setErrorHandler(fastifyOtpErrorHandler);
    app.post("/otp/generate", createGenerateChallengeHandler({ otpService }));

    const response = await app.inject({
      method: "POST",
      payload: {
        channel: "push",
        purpose: "LOGIN",
        recipient: "+15551234567"
      },
      url: "/otp/generate"
    });

    expect(response.statusCode).toBe(422);
    expect(response.json()).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Generate challenge channel must be either sms or email."
      }
    });
  });

  it("maps verify result statuses to predictable HTTP response codes", async () => {
    const otpService = createOtpService({
      challengeIdGenerator: () => "challenge-fastify",
      clock: createFixedClock("2026-04-04T10:00:00.000Z"),
      delivery: new RecordingDelivery(),
      otpGenerator: () => "123456",
      policy: {
        maxVerifyAttempts: 1,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "fastify-secret" }),
      store: new InMemoryChallengeStore()
    });

    await otpService.generateChallenge({
      channel: "sms",
      purpose: "LOGIN",
      recipient: "+15551234567"
    });

    const app = Fastify();
    app.setErrorHandler(fastifyOtpErrorHandler);
    app.post("/otp/verify", createVerifyChallengeHandler({ otpService }));

    const invalidResponse = await app.inject({
      method: "POST",
      payload: {
        challengeId: "challenge-fastify",
        otp: "000000"
      },
      url: "/otp/verify"
    });

    expect(invalidResponse.statusCode).toBe(429);
    expect(invalidResponse.json()).toEqual({
      challengeId: "challenge-fastify",
      status: "ATTEMPTS_EXCEEDED"
    });

    const expiredResponse = await app.inject({
      method: "POST",
      payload: {
        challengeId: "missing-challenge",
        otp: "000000"
      },
      url: "/otp/verify"
    });

    expect(expiredResponse.statusCode).toBe(410);
    expect(expiredResponse.json()).toEqual({
      challengeId: "missing-challenge",
      status: "EXPIRED"
    });
  });
});
