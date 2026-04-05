import express from "express";
import type { Express, RequestHandler } from "express";

import { createGenerateChallengeHandler, createVerifyChallengeHandler } from "@otp-service/express";
import { createTwilioSmsOtpService, type RedisStoreClient, type TwilioHttpClient } from "@otp-service/starter";

export interface CreateStarterExpressAppOptions {
  otpValues?: readonly string[];
}

export interface ExampleStarterExpressApp {
  app: Express;
  deliveryRequests: TwilioSmsRequest[];
  generateHandler: RequestHandler;
  verifyHandler: RequestHandler;
}

export interface TwilioSmsRequest {
  body: {
    body: string | null;
    from: string | null;
    to: string | null;
  };
  headers: Record<string, string>;
  url: string;
}

export function createStarterExpressApp(
  options: CreateStarterExpressAppOptions = {}
): ExampleStarterExpressApp {
  const app = express();
  const redis = new MemoryRedisClient();
  const twilio = new RecordingTwilioHttpClient();
  const otpValues = [...(options.otpValues ?? ["123456", "654321", "111111"])];
  const otpService = createTwilioSmsOtpService({
    challengeIdGenerator: () => crypto.randomUUID(),
    otpGenerator: () => {
      const otp = otpValues.shift();
      if (otp === undefined) {
        throw new Error("No OTP values remaining for the starter example.");
      }

      return otp;
    },
    redis: {
      client: redis,
      keyPrefix: "starter-example"
    },
    signerSecret: process.env.OTP_SECRET ?? "development-secret",
    twilio: {
      accountSid: "ACstarter",
      authToken: "starter-token",
      from: "+15550000000",
      httpClient: twilio
    }
  });

  const generateHandler = createGenerateChallengeHandler({ otpService });
  const verifyHandler = createVerifyChallengeHandler({ otpService });

  app.use(express.json());
  app.post("/otp/generate", generateHandler);
  app.post("/otp/verify", verifyHandler);
  app.get("/otp/debug/deliveries", (_request, response) => {
    response.json({
      deliveries: twilio.requests
    });
  });

  return {
    app,
    deliveryRequests: twilio.requests,
    generateHandler,
    verifyHandler
  };
}

class MemoryRedisClient implements RedisStoreClient {
  private readonly records = new Map<string, string>();

  del(key: string): Promise<number> {
    const deleted = this.records.delete(key);
    return Promise.resolve(deleted ? 1 : 0);
  }

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.records.get(key) ?? null);
  }

  set(
    key: string,
    value: string,
    options: { expiration: { type: "EX"; value: number } }
  ): Promise<unknown> {
    void options;
    this.records.set(key, value);
    return Promise.resolve("OK");
  }
}

class RecordingTwilioHttpClient implements TwilioHttpClient {
  readonly requests: TwilioSmsRequest[] = [];

  post(
    url: string,
    input: {
      body: URLSearchParams;
      headers: Record<string, string>;
    }
  ): Promise<{ json(): Promise<unknown>; status: number }> {
    this.requests.push({
      body: {
        body: input.body.get("Body"),
        from: input.body.get("From"),
        to: input.body.get("To")
      },
      headers: structuredClone(input.headers),
      url
    });

    return Promise.resolve({
      json: () =>
        Promise.resolve({
          sid: `SM${this.requests.length}`
        }),
      status: 201
    });
  }
}
