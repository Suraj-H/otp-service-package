import express from "express";
import { afterEach, describe, expect, it } from "vitest";
import type { RequestHandler } from "express";

import { createOtpService, hmacOtpSigner } from "@otp-service/core";
import {
  InMemoryChallengeStore,
  RecordingDelivery,
  createDeterministicOtpGenerator,
  createFixedClock
} from "@otp-service/testkit";

import { createGenerateChallengeHandler, createVerifyChallengeHandler } from "../src/index.js";

describe("@otp-service/express", () => {
  afterEach(() => undefined);

  it("handles generate and verify flows through Express route handlers", async () => {
    const delivery = new RecordingDelivery();
    const generator = createDeterministicOtpGenerator(["123456"]);
    const store = new InMemoryChallengeStore();
    const otpService = createOtpService({
      challengeIdGenerator: () => "challenge-express",
      clock: createFixedClock("2026-04-04T10:00:00.000Z"),
      delivery,
      otpGenerator: () => generator.nextOtp(),
      policy: {
        maxVerifyAttempts: 3,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "express-secret" }),
      store
    });

    const app = express();
    app.use(express.json());
    app.post("/otp/generate", createGenerateChallengeHandler({ otpService }));
    app.post("/otp/verify", createVerifyChallengeHandler({ otpService }));

    const generateResponse = await invokeJsonHandler(
      createGenerateChallengeHandler({ otpService }),
      {
        channel: "sms",
        purpose: "LOGIN",
        recipient: "+15551234567"
      }
    );

    expect(generateResponse.status).toBe(201);
    expect(generateResponse.body).toEqual({
      challengeId: "challenge-express",
      expiresAt: new Date("2026-04-04T10:10:00.000Z"),
      status: "CHALLENGE_CREATED"
    });
    expect(delivery.lastRequest().otp).toBe("123456");

    const verifyResponse = await invokeJsonHandler(
      createVerifyChallengeHandler({ otpService }),
      {
        challengeId: "challenge-express",
        otp: "123456"
      }
    );

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body).toEqual({
      challengeId: "challenge-express",
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
      signer: hmacOtpSigner({ secret: "express-secret" }),
      store: new InMemoryChallengeStore()
    });

    const app = express();
    app.use(express.json());
    app.post("/otp/generate", createGenerateChallengeHandler({ otpService }));

    const response = await invokeJsonHandler(
      createGenerateChallengeHandler({ otpService }),
      {
        channel: "push",
        purpose: "LOGIN",
        recipient: "+15551234567"
      }
    );

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      error: {
        code: "VALIDATION_ERROR",
        message: "Generate challenge channel must be either sms or email."
      }
    });
  });

  it("maps verify result statuses to predictable HTTP response codes", async () => {
    const otpService = createOtpService({
      challengeIdGenerator: () => "challenge-express",
      clock: createFixedClock("2026-04-04T10:00:00.000Z"),
      delivery: new RecordingDelivery(),
      otpGenerator: () => "123456",
      policy: {
        maxVerifyAttempts: 1,
        otpLength: 6,
        ttlSeconds: 600
      },
      signer: hmacOtpSigner({ secret: "express-secret" }),
      store: new InMemoryChallengeStore()
    });

    await otpService.generateChallenge({
      channel: "sms",
      purpose: "LOGIN",
      recipient: "+15551234567"
    });

    const app = express();
    app.use(express.json());
    app.post("/otp/verify", createVerifyChallengeHandler({ otpService }));

    const invalidResponse = await invokeJsonHandler(
      createVerifyChallengeHandler({ otpService }),
      {
        challengeId: "challenge-express",
        otp: "000000"
      }
    );

    expect(invalidResponse.status).toBe(429);
    expect(invalidResponse.body).toEqual({
      challengeId: "challenge-express",
      status: "ATTEMPTS_EXCEEDED"
    });

    const expiredResponse = await invokeJsonHandler(
      createVerifyChallengeHandler({ otpService }),
      {
        challengeId: "missing-challenge",
        otp: "000000"
      }
    );

    expect(expiredResponse.status).toBe(410);
    expect(expiredResponse.body).toEqual({
      challengeId: "missing-challenge",
      status: "EXPIRED"
    });
  });
});

async function invokeJsonHandler(
  handler: RequestHandler,
  body: unknown
) {
  const request = { body } as Parameters<typeof handler>[0];
  const responseState: { body?: unknown; statusCode: number } = {
    statusCode: 200
  };
  const response = {
    json(payload: unknown) {
      responseState.body = payload;
      return response;
    },
    status(statusCode: number) {
      responseState.statusCode = statusCode;
      return response;
    }
  } as Parameters<typeof handler>[1];

  await new Promise<void>((resolve, reject) => {
    const maybePromise = handler(request, response, (error?: unknown) => {
      if (error !== undefined) {
        reject(error instanceof Error ? error : new Error("Express handler passed a non-Error to next()."));
        return;
      }

      resolve();
    });

    void Promise.resolve(maybePromise).then(() => resolve(), reject);
  });

  return {
    body: responseState.body,
    status: responseState.statusCode
  };
}
