import { describe, expect, it } from "vitest";

import type { DeliveryRequest } from "@otp-service/core";

import { createTwilioSmsProvider, type TwilioHttpClient } from "../src/index.js";

describe("@otp-service/provider-sms-twilio", () => {
  it("posts an SMS challenge to the Twilio Messages API", async () => {
    const client = new RecordingTwilioHttpClient({
      json: { sid: "SM123" },
      status: 201
    });

    const provider = createTwilioSmsProvider({
      accountSid: "AC123",
      authToken: "auth-token",
      from: "+15550000000",
      httpClient: client
    });

    await provider.sendChallenge(exampleRequest());

    expect(client.requests).toEqual([
      {
        body: "Body=Your+LOGIN+OTP+is+123456.+It+expires+at+2026-04-04T10%3A10%3A00.000Z.&From=%2B15550000000&To=%2B15551234567",
        headers: {
          authorization: "Basic QUMxMjM6YXV0aC10b2tlbg==",
          "content-type": "application/x-www-form-urlencoded"
        },
        url: "https://api.twilio.com/2010-04-01/Accounts/AC123/Messages.json"
      }
    ]);
  });

  it("maps non-2xx Twilio responses to retryable delivery errors when appropriate", async () => {
    const client = new RecordingTwilioHttpClient({
      json: { code: 20429, message: "Too many requests" },
      status: 429
    });

    const provider = createTwilioSmsProvider({
      accountSid: "AC123",
      authToken: "auth-token",
      from: "+15550000000",
      httpClient: client
    });

    await expect(provider.sendChallenge(exampleRequest())).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty("code", "SMS_DELIVERY_FAILED");
      expect(error).toHaveProperty("deliveryOutcome", "DEFINITIVE_FAILURE");
      expect(error).toHaveProperty("provider", "twilio");
      expect(error).toHaveProperty("retryable", true);
      return true;
    });
  });

  it("rejects unsupported channels before making an HTTP call", async () => {
    const client = new RecordingTwilioHttpClient({
      json: { sid: "SM123" },
      status: 201
    });

    const provider = createTwilioSmsProvider({
      accountSid: "AC123",
      authToken: "auth-token",
      from: "+15550000000",
      httpClient: client
    });

    await expect(
      provider.sendChallenge({
        ...exampleRequest(),
        channel: "email"
      })
    ).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty("code", "UNSUPPORTED_CHANNEL");
      expect(error).toHaveProperty("deliveryOutcome", "DEFINITIVE_FAILURE");
      expect(error).toHaveProperty("provider", "twilio");
      expect(error).toHaveProperty("retryable", false);
      return true;
    });

    expect(client.requests).toHaveLength(0);
  });

  it("rejects malformed Twilio success payloads instead of trusting them", async () => {
    const client = new RecordingTwilioHttpClient({
      json: { status: "queued" },
      status: 201
    });

    const provider = createTwilioSmsProvider({
      accountSid: "AC123",
      authToken: "auth-token",
      from: "+15550000000",
      httpClient: client
    });

    await expect(provider.sendChallenge(exampleRequest())).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty("code", "INVALID_PROVIDER_RESPONSE");
      expect(error).toHaveProperty("deliveryOutcome", "OUTCOME_UNKNOWN");
      expect(error).toHaveProperty("provider", "twilio");
      expect(error).toHaveProperty("retryable", false);
      return true;
    });
  });

  it("maps transport failures to ambiguous delivery errors", async () => {
    const client: TwilioHttpClient = {
      post() {
        return Promise.reject(new Error("socket hang up"));
      }
    };

    const provider = createTwilioSmsProvider({
      accountSid: "AC123",
      authToken: "auth-token",
      from: "+15550000000",
      httpClient: client
    });

    await expect(provider.sendChallenge(exampleRequest())).rejects.toSatisfy((error: unknown) => {
      expect(error).toBeInstanceOf(Error);
      expect(error).toHaveProperty("code", "SMS_DELIVERY_TRANSPORT_ERROR");
      expect(error).toHaveProperty("deliveryOutcome", "OUTCOME_UNKNOWN");
      expect(error).toHaveProperty("provider", "twilio");
      expect(error).toHaveProperty("retryable", true);
      return true;
    });
  });
});

class RecordingTwilioHttpClient implements TwilioHttpClient {
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
      body: URLSearchParams;
      headers: Record<string, string>;
    }
  ) {
    this.requests.push({
      body: input.body.toString(),
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
    channel: "sms",
    expiresAt: new Date("2026-04-04T10:10:00.000Z"),
    otp: "123456",
    purpose: "LOGIN",
    recipient: "+15551234567"
  };
}
