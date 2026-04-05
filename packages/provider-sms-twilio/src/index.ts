import { Buffer } from "node:buffer";

import { OtpDeliveryError, type DeliveryRequest, type OtpDelivery } from "@otp-service/core";

export interface TwilioHttpClient {
  post(
    url: string,
    input: {
      body: URLSearchParams;
      headers: Record<string, string>;
    }
  ): Promise<TwilioHttpResponse>;
}

export interface TwilioHttpResponse {
  json(): Promise<unknown>;
  status: number;
}

export interface CreateTwilioSmsProviderOptions {
  accountSid: string;
  apiBaseUrl?: string;
  from: string;
  httpClient: TwilioHttpClient;
  messageFormatter?: (request: DeliveryRequest) => string;
  authToken: string;
}

interface TwilioSuccessResponse {
  sid: string;
  status?: string;
}

export function createTwilioSmsProvider(
  options: CreateTwilioSmsProviderOptions
): OtpDelivery {
  validateOptions(options);

  return {
    async sendChallenge(request) {
      if (request.channel !== "sms") {
        throw new OtpDeliveryError({
          code: "UNSUPPORTED_CHANNEL",
          deliveryOutcome: "DEFINITIVE_FAILURE",
          message: "Twilio SMS provider only supports sms delivery.",
          provider: "twilio",
          retryable: false
        });
      }

      let response: TwilioHttpResponse;

      try {
        response = await options.httpClient.post(buildMessagesUrl(options), {
          body: new URLSearchParams({
            Body: formatMessage(options, request),
            From: options.from,
            To: request.recipient
          }),
          headers: {
            authorization: `Basic ${toBasicAuthToken(options.accountSid, options.authToken)}`,
            "content-type": "application/x-www-form-urlencoded"
          }
        });
      } catch (cause) {
        throw new OtpDeliveryError({
          cause,
          code: "SMS_DELIVERY_TRANSPORT_ERROR",
          deliveryOutcome: "OUTCOME_UNKNOWN",
          message: "Twilio SMS delivery transport failed before provider acceptance was confirmed.",
          provider: "twilio",
          retryable: true
        });
      }

      let payload: unknown;

      try {
        payload = await response.json();
      } catch (cause) {
        throw new OtpDeliveryError({
          cause,
          code: "INVALID_PROVIDER_RESPONSE",
          deliveryOutcome: response.status >= 200 && response.status < 300 ? "OUTCOME_UNKNOWN" : "DEFINITIVE_FAILURE",
          message: "Twilio SMS provider returned an unreadable response payload.",
          provider: "twilio",
          retryable: response.status >= 500 || response.status === 429
        });
      }

      if (response.status < 200 || response.status >= 300) {
        throw new OtpDeliveryError({
          cause: payload,
          code: "SMS_DELIVERY_FAILED",
          deliveryOutcome: "DEFINITIVE_FAILURE",
          message: "Twilio SMS delivery request failed.",
          provider: "twilio",
          retryable: response.status >= 500 || response.status === 429
        });
      }

      assertTwilioSuccessResponse(payload);
    }
  };
}

function assertTwilioSuccessResponse(payload: unknown): asserts payload is TwilioSuccessResponse {
  if (typeof payload !== "object" || payload === null) {
    throw new OtpDeliveryError({
      code: "INVALID_PROVIDER_RESPONSE",
      deliveryOutcome: "OUTCOME_UNKNOWN",
      message: "Twilio SMS provider returned a non-object response.",
      provider: "twilio",
      retryable: false
    });
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.sid !== "string" || record.sid.trim().length === 0) {
    throw new OtpDeliveryError({
      cause: payload,
      code: "INVALID_PROVIDER_RESPONSE",
      deliveryOutcome: "OUTCOME_UNKNOWN",
      message: "Twilio SMS provider response is missing a message SID.",
      provider: "twilio",
      retryable: false
    });
  }
}

function buildMessagesUrl(options: CreateTwilioSmsProviderOptions): string {
  const baseUrl = options.apiBaseUrl ?? "https://api.twilio.com";
  return `${baseUrl}/2010-04-01/Accounts/${options.accountSid}/Messages.json`;
}

function formatMessage(
  options: CreateTwilioSmsProviderOptions,
  request: DeliveryRequest
): string {
  const formatter =
    options.messageFormatter ??
    ((deliveryRequest: DeliveryRequest) =>
      `Your ${deliveryRequest.purpose} OTP is ${deliveryRequest.otp}. It expires at ${deliveryRequest.expiresAt.toISOString()}.`);

  return formatter(request);
}

function toBasicAuthToken(accountSid: string, authToken: string): string {
  return Buffer.from(`${accountSid}:${authToken}`, "utf8").toString("base64");
}

function validateOptions(options: CreateTwilioSmsProviderOptions): void {
  if (options.accountSid.trim().length === 0) {
    throw new Error("Twilio accountSid must not be empty.");
  }

  if (options.authToken.trim().length === 0) {
    throw new Error("Twilio authToken must not be empty.");
  }

  if (options.from.trim().length === 0) {
    throw new Error("Twilio from number must not be empty.");
  }
}
