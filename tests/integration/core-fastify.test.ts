import { describe, expect, it } from "vitest";

import { createExampleFastifyApp } from "../../examples/fastify-email/src/app.js";

describe("core + fastify integration", () => {
  it("supports the example Fastify OTP flow end-to-end", async () => {
    const { app, delivery } = createExampleFastifyApp({
      otpValues: ["123456"]
    });

    const generateResponse = await app.inject({
      method: "POST",
      payload: {
        channel: "email",
        purpose: "VERIFY_EMAIL",
        recipient: "alice@example.com"
      },
      url: "/otp/generate"
    });

    expect(generateResponse.statusCode).toBe(201);
    const generatePayload: {
      challengeId: string;
      status: string;
    } = generateResponse.json();
    expect(generatePayload.status).toBe("CHALLENGE_CREATED");
    expect(delivery.lastRequest().otp).toBe("123456");

    const verifyResponse = await app.inject({
      method: "POST",
      payload: {
        challengeId: generatePayload.challengeId,
        otp: "123456"
      },
      url: "/otp/verify"
    });

    expect(verifyResponse.statusCode).toBe(200);
    expect(verifyResponse.json()).toEqual({
      challengeId: generatePayload.challengeId,
      status: "VERIFIED"
    });
  });
});
