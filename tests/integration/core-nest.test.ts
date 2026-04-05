import "reflect-metadata";

import { Test } from "@nestjs/testing";
import { describe, expect, it } from "vitest";

import { createExampleNestApp } from "../../examples/nest-sms/src/app.js";

describe("core + nest integration", () => {
  it("supports the example Nest OTP flow through the dynamic module", async () => {
    const { controller: ControllerClass, delivery, module } = createExampleNestApp({
      otpValues: ["123456"]
    });

    const moduleRef = await Test.createTestingModule({
      imports: [module]
    }).compile();

    const controller = moduleRef.get(ControllerClass);

    const generateResult = await controller.generateChallenge({
      channel: "sms",
      purpose: "LOGIN",
      recipient: "+15551234567"
    });

    expect(generateResult.status).toBe("CHALLENGE_CREATED");
    expect(delivery.lastRequest().otp).toBe("123456");

    await expect(
      controller.verifyChallenge({
        challengeId: generateResult.challengeId,
        otp: "123456"
      })
    ).resolves.toEqual({
      challengeId: generateResult.challengeId,
      status: "VERIFIED"
    });
  });
});
