import type { RequestHandler } from "express";

import type {
  GenerateChallengeInput,
  OtpService,
  VerifyChallengeInput,
  VerifyChallengeResult
} from "@otp-service/core";

export interface CreateGenerateChallengeHandlerOptions {
  mapBody?: (body: unknown) => GenerateChallengeInput;
  otpService: OtpService;
}

export interface CreateVerifyChallengeHandlerOptions {
  mapBody?: (body: unknown) => VerifyChallengeInput;
  otpService: OtpService;
}

export function createGenerateChallengeHandler(
  options: CreateGenerateChallengeHandlerOptions
): RequestHandler {
  return async (request, response, next) => {
    try {
      const input = (options.mapBody ?? mapGenerateChallengeBody)(request.body);
      const result = await options.otpService.generateChallenge(input);
      response.status(201).json(result);
    } catch (error) {
      if (error instanceof ExpressOtpValidationError) {
        response.status(422).json({
          error: {
            code: "VALIDATION_ERROR",
            message: error.message
          }
        });
        return;
      }

      next(error);
    }
  };
}

export function createVerifyChallengeHandler(
  options: CreateVerifyChallengeHandlerOptions
): RequestHandler {
  return async (request, response, next) => {
    try {
      const input = (options.mapBody ?? mapVerifyChallengeBody)(request.body);
      const result = await options.otpService.verifyChallenge(input);
      response.status(statusCodeForVerifyResult(result)).json(result);
    } catch (error) {
      if (error instanceof ExpressOtpValidationError) {
        response.status(422).json({
          error: {
            code: "VALIDATION_ERROR",
            message: error.message
          }
        });
        return;
      }

      next(error);
    }
  };
}

export class ExpressOtpValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExpressOtpValidationError";
  }
}

function mapGenerateChallengeBody(body: unknown): GenerateChallengeInput {
  const record = requireObject(body, "Generate challenge body must be an object.");
  return {
    channel: requireChannel(record.channel),
    purpose: requireTrimmedString(record.purpose, "Generate challenge purpose must be a non-empty string."),
    recipient: requireTrimmedString(record.recipient, "Generate challenge recipient must be a non-empty string.")
  };
}

function mapVerifyChallengeBody(body: unknown): VerifyChallengeInput {
  const record = requireObject(body, "Verify challenge body must be an object.");
  return {
    challengeId: requireTrimmedString(
      record.challengeId,
      "Verify challenge challengeId must be a non-empty string."
    ),
    otp: requireTrimmedString(record.otp, "Verify challenge otp must be a non-empty string.")
  };
}

function requireObject(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null) {
    throw new ExpressOtpValidationError(message);
  }

  return value as Record<string, unknown>;
}

function requireTrimmedString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new ExpressOtpValidationError(message);
  }

  return value.trim();
}

function requireChannel(value: unknown): GenerateChallengeInput["channel"] {
  if (value === "sms" || value === "email") {
    return value;
  }

  throw new ExpressOtpValidationError("Generate challenge channel must be either sms or email.");
}

function statusCodeForVerifyResult(result: VerifyChallengeResult): number {
  switch (result.status) {
    case "VERIFIED":
      return 200;
    case "INVALID":
      return 400;
    case "EXPIRED":
      return 410;
    case "ATTEMPTS_EXCEEDED":
      return 429;
  }
}
