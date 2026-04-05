import "reflect-metadata";

import {
  Body,
  Controller,
  Inject,
  Module,
  Post,
  UnprocessableEntityException,
  type Type,
  type DynamicModule,
  type Provider
} from "@nestjs/common";

import type {
  GenerateChallengeInput,
  OtpService,
  VerifyChallengeInput,
  VerifyChallengeResult
} from "@otp-service/core";

export const OTP_SERVICE_TOKEN = Symbol("OTP_SERVICE_TOKEN");

export interface CreateNestOtpModuleOptions {
  otpService: OtpService;
  pathPrefix?: string;
}

export interface NestOtpController {
  generateChallenge(body: unknown): Promise<ReturnType<OtpService["generateChallenge"]> extends Promise<infer T> ? T : never>;
  verifyChallenge(body: unknown): Promise<VerifyChallengeResult>;
}

export type NestOtpControllerClass = Type<NestOtpController>;

export function createNestOtpModule(options: CreateNestOtpModuleOptions): DynamicModule {
  const controller = createOtpController(options.pathPrefix ?? "otp");
  const provider: Provider = {
    provide: OTP_SERVICE_TOKEN,
    useValue: options.otpService
  };

  @Module({
    controllers: [controller],
    providers: [provider],
    exports: [provider]
  })
  class OtpModule {}

  return {
    controllers: [controller],
    exports: [provider],
    module: OtpModule,
    providers: [provider]
  };
}

export function createOtpController(pathPrefix = "otp"): NestOtpControllerClass {
  @Controller(pathPrefix)
  class OtpController implements NestOtpController {
    constructor(@Inject(OTP_SERVICE_TOKEN) public readonly otpService: OtpService) {}

    @Post("generate")
    async generateChallenge(@Body() body: unknown) {
      const input = mapGenerateChallengeBody(body);
      return this.otpService.generateChallenge(input);
    }

    @Post("verify")
    async verifyChallenge(@Body() body: unknown): Promise<VerifyChallengeResult> {
      const input = mapVerifyChallengeBody(body);
      return this.otpService.verifyChallenge(input);
    }
  }

  return OtpController as NestOtpControllerClass;
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
    throw new UnprocessableEntityException({
      error: {
        code: "VALIDATION_ERROR",
        message
      }
    });
  }

  return value as Record<string, unknown>;
}

function requireTrimmedString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new UnprocessableEntityException({
      error: {
        code: "VALIDATION_ERROR",
        message
      }
    });
  }

  return value.trim();
}

function requireChannel(value: unknown): GenerateChallengeInput["channel"] {
  if (value === "sms" || value === "email") {
    return value;
  }

  throw new UnprocessableEntityException({
    error: {
      code: "VALIDATION_ERROR",
      message: "Generate challenge channel must be either sms or email."
    }
  });
}
