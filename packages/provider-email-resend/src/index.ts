import { OtpDeliveryError, type DeliveryRequest, type OtpDelivery } from "@otp-service/core";

export interface ResendHttpClient {
  post(
    url: string,
    input: {
      body: string;
      headers: Record<string, string>;
    }
  ): Promise<ResendHttpResponse>;
}

export interface ResendHttpResponse {
  json(): Promise<unknown>;
  status: number;
}

export interface CreateResendEmailProviderOptions {
  apiBaseUrl?: string;
  apiKey: string;
  from: string;
  httpClient: ResendHttpClient;
  subjectFormatter?: (request: DeliveryRequest) => string;
  textFormatter?: (request: DeliveryRequest) => string;
}

interface ResendSuccessResponse {
  id: string;
}

export function createResendEmailProvider(
  options: CreateResendEmailProviderOptions
): OtpDelivery {
  validateOptions(options);

  return {
    async sendChallenge(request: DeliveryRequest) {
      if (request.channel !== "email") {
        throw new OtpDeliveryError({
          code: "UNSUPPORTED_CHANNEL",
          deliveryOutcome: "DEFINITIVE_FAILURE",
          message: "Resend email provider only supports email delivery.",
          provider: "resend",
          retryable: false
        });
      }

      let response: ResendHttpResponse;

      try {
        response = await options.httpClient.post(buildEmailsUrl(options), {
          body: JSON.stringify({
            from: options.from,
            subject: formatSubject(options, request),
            text: formatText(options, request),
            to: [request.recipient]
          }),
          headers: {
            authorization: `Bearer ${options.apiKey}`,
            "content-type": "application/json"
          }
        });
      } catch (cause) {
        throw new OtpDeliveryError({
          cause,
          code: "EMAIL_DELIVERY_TRANSPORT_ERROR",
          deliveryOutcome: "OUTCOME_UNKNOWN",
          message: "Resend email delivery transport failed before provider acceptance was confirmed.",
          provider: "resend",
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
          message: "Resend email provider returned an unreadable response payload.",
          provider: "resend",
          retryable: response.status >= 500 || response.status === 429
        });
      }

      if (response.status < 200 || response.status >= 300) {
        throw new OtpDeliveryError({
          cause: payload,
          code: "EMAIL_DELIVERY_FAILED",
          deliveryOutcome: "DEFINITIVE_FAILURE",
          message: "Resend email delivery request failed.",
          provider: "resend",
          retryable: response.status >= 500 || response.status === 429
        });
      }

      assertResendSuccessResponse(payload);
    }
  };
}

function assertResendSuccessResponse(payload: unknown): asserts payload is ResendSuccessResponse {
  if (typeof payload !== "object" || payload === null) {
    throw new OtpDeliveryError({
      code: "INVALID_PROVIDER_RESPONSE",
      deliveryOutcome: "OUTCOME_UNKNOWN",
      message: "Resend email provider returned a non-object response.",
      provider: "resend",
      retryable: false
    });
  }

  const record = payload as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id.trim().length === 0) {
    throw new OtpDeliveryError({
      cause: payload,
      code: "INVALID_PROVIDER_RESPONSE",
      deliveryOutcome: "OUTCOME_UNKNOWN",
      message: "Resend email provider response is missing an email ID.",
      provider: "resend",
      retryable: false
    });
  }
}

function buildEmailsUrl(options: CreateResendEmailProviderOptions): string {
  const baseUrl = options.apiBaseUrl ?? "https://api.resend.com";
  return `${baseUrl}/emails`;
}

function formatSubject(
  options: CreateResendEmailProviderOptions,
  request: DeliveryRequest
): string {
  const formatter =
    options.subjectFormatter ??
    ((deliveryRequest: DeliveryRequest) => `${deliveryRequest.purpose} OTP`);

  return formatter(request);
}

function formatText(
  options: CreateResendEmailProviderOptions,
  request: DeliveryRequest
): string {
  const formatter =
    options.textFormatter ??
    ((deliveryRequest: DeliveryRequest) =>
      `Your ${deliveryRequest.purpose} OTP is ${deliveryRequest.otp}. It expires at ${deliveryRequest.expiresAt.toISOString()}.`);

  return formatter(request);
}

function validateOptions(options: CreateResendEmailProviderOptions): void {
  if (options.apiKey.trim().length === 0) {
    throw new Error("Resend apiKey must not be empty.");
  }

  if (options.from.trim().length === 0) {
    throw new Error("Resend from address must not be empty.");
  }
}
