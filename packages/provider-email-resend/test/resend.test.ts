import { describe, expect, it } from "vitest";

import type { DeliveryRequest } from "@otp-service/core";

import { createResendEmailProvider, type ResendHttpClient } from "../src/index.js";

describe("@otp-service/provider-email-resend", () => {
  it("posts an email challenge to the Resend emails API", async () => {
    const client = new RecordingResendHttpClient({
      json: { id: "email_123" },
      status: 200
    });

    const provider = createResendEmailProvider({
      apiKey: "re_test_key",
      from: "otp@example.com",
      httpClient: client
    });

    await provider.sendChallenge(exampleRequest());

    expect(client.requests).toEqual([
      {
        body: JSON.stringify({
          from: "otp@example.com",
          subject: "VERIFY_EMAIL OTP",
          text: "Your VERIFY_EMAIL OTP is 123456. It expires at 2026-04-04T10:10:00.000Z.",
          to: ["alice@example.com"]
        }),
        headers: {
          authorization: "Bearer re_test_key",
          "content-type": "application/json"
        },
        url: "https://api.resend.com/emails"
      }
    ]);
  });

  it("maps non-2xx Resend responses to delivery errors", async () => {
    const client = new RecordingResendHttpClient({
      json: { message: "Rate limit exceeded" },
      status: 429
    });

    const provider = createResendEmailProvider({
      apiKey: "re_test_key",
      from: "otp@example.com",
      httpClient: client
    });

    await expect(provider.sendChallenge(exampleRequest())).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty("code", "EMAIL_DELIVERY_FAILED");
      expect(error).toHaveProperty("deliveryOutcome", "DEFINITIVE_FAILURE");
      expect(error).toHaveProperty("provider", "resend");
      expect(error).toHaveProperty("retryable", true);
      return true;
    });
  });

  it("rejects unsupported channels before making an HTTP call", async () => {
    const client = new RecordingResendHttpClient({
      json: { id: "email_123" },
      status: 200
    });

    const provider = createResendEmailProvider({
      apiKey: "re_test_key",
      from: "otp@example.com",
      httpClient: client
    });

    await expect(
      provider.sendChallenge({
        ...exampleRequest(),
        channel: "sms"
      })
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty("code", "UNSUPPORTED_CHANNEL");
      expect(error).toHaveProperty("deliveryOutcome", "DEFINITIVE_FAILURE");
      expect(error).toHaveProperty("provider", "resend");
      expect(error).toHaveProperty("retryable", false);
      return true;
    });

    expect(client.requests).toHaveLength(0);
  });

  it("rejects malformed Resend success payloads instead of trusting them", async () => {
    const client = new RecordingResendHttpClient({
      json: { status: "queued" },
      status: 200
    });

    const provider = createResendEmailProvider({
      apiKey: "re_test_key",
      from: "otp@example.com",
      httpClient: client
    });

    await expect(provider.sendChallenge(exampleRequest())).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty("code", "INVALID_PROVIDER_RESPONSE");
      expect(error).toHaveProperty("deliveryOutcome", "OUTCOME_UNKNOWN");
      expect(error).toHaveProperty("provider", "resend");
      expect(error).toHaveProperty("retryable", false);
      return true;
    });
  });

  it("maps transport failures to ambiguous delivery errors", async () => {
    const client: ResendHttpClient = {
      post() {
        return Promise.reject(new Error("network timeout"));
      }
    };

    const provider = createResendEmailProvider({
      apiKey: "re_test_key",
      from: "otp@example.com",
      httpClient: client
    });

    await expect(provider.sendChallenge(exampleRequest())).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty("code", "EMAIL_DELIVERY_TRANSPORT_ERROR");
      expect(error).toHaveProperty("deliveryOutcome", "OUTCOME_UNKNOWN");
      expect(error).toHaveProperty("provider", "resend");
      expect(error).toHaveProperty("retryable", true);
      return true;
    });
  });
});

class RecordingResendHttpClient implements ResendHttpClient {
  readonly requests: Array<{
    body: string;
    headers: Record<string, string>;
    url: string;
  }> = [];

  constructor(
    private readonly response: {
      json: unknown;
      status: number;
    }
  ) {}

  post(
    url: string,
    input: {
      body: string;
      headers: Record<string, string>;
    }
  ) {
    this.requests.push({
      body: input.body,
      headers: input.headers,
      url
    });

    return Promise.resolve({
      json: () => Promise.resolve(this.response.json),
      status: this.response.status
    });
  }
}

function exampleRequest(): DeliveryRequest {
  return {
    challengeId: "challenge-123",
    channel: "email",
    expiresAt: new Date("2026-04-04T10:10:00.000Z"),
    otp: "123456",
    purpose: "VERIFY_EMAIL",
    recipient: "alice@example.com"
  };
}
