import type { RequestHandler } from "express";
import { describe, expect, it } from "vitest";

import { createStarterExpressApp } from "../../examples/starter-express-sms/src/app.js";

describe("starter + express integration", () => {
  it("supports the quickstart Express OTP flow", async () => {
    const { deliveryRequests, generateHandler, verifyHandler } = createStarterExpressApp({
      otpValues: ["123456"]
    });

    const generateResponse = await invokeJsonHandler(generateHandler, {
      channel: "sms",
      purpose: "LOGIN",
      recipient: "+15551234567"
    });

    expect(generateResponse.status).toBe(201);
    const generatePayload = generateResponse.body as { challengeId: string; status: string };
    expect(generatePayload.status).toBe("CHALLENGE_CREATED");
    expect(deliveryRequests.at(-1)?.body.to).toBe("+15551234567");
    expect(deliveryRequests.at(-1)?.body.body).toContain("123456");

    const verifyResponse = await invokeJsonHandler(verifyHandler, {
      challengeId: generatePayload.challengeId,
      otp: "123456"
    });

    expect(verifyResponse.status).toBe(200);
    expect(verifyResponse.body).toEqual({
      challengeId: generatePayload.challengeId,
      status: "VERIFIED"
    });
  });
});

async function invokeJsonHandler(handler: RequestHandler, body: unknown) {
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
