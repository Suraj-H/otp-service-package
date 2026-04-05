import type { FastifyReply, FastifyRequest, RouteHandlerMethod } from "fastify";

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
): RouteHandlerMethod {
  return async (request, reply) => {
    const input = (options.mapBody ?? mapGenerateChallengeBody)(request.body);
    const result = await options.otpService.generateChallenge(input);
    return reply.status(201).send(result);
  };
}

export function createVerifyChallengeHandler(
  options: CreateVerifyChallengeHandlerOptions
): RouteHandlerMethod {
  return async (request, reply) => {
    const input = (options.mapBody ?? mapVerifyChallengeBody)(request.body);
    const result = await options.otpService.verifyChallenge(input);
    return reply.status(statusCodeForVerifyResult(result)).send(result);
  };
}

export function fastifyOtpErrorHandler(
  error: unknown,
  _request: FastifyRequest,
  reply: FastifyReply
): void {
  if (error instanceof FastifyOtpValidationError) {
    reply.status(422).send({
      error: {
        code: "VALIDATION_ERROR",
        message: error.message
      }
    });
    return;
  }

  throw error;
}

export class FastifyOtpValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FastifyOtpValidationError";
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
    throw new FastifyOtpValidationError(message);
  }

  return value as Record<string, unknown>;
}

function requireTrimmedString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new FastifyOtpValidationError(message);
  }

  return value.trim();
}

function requireChannel(value: unknown): GenerateChallengeInput["channel"] {
  if (value === "sms" || value === "email") {
    return value;
  }

  throw new FastifyOtpValidationError("Generate challenge channel must be either sms or email.");
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
