# Direct Package Setup

This path is for teams that want explicit control over every layer instead of using `@otp-service/starter`.

## When To Use It

Use the direct package path when you want:

- manual control over `core` composition
- direct access to store/provider boundaries
- a future path to swap adapters without changing your service shape much

## Assembly Order

1. Build a `ChallengeStore` with `@otp-service/redis-store`
2. Build a delivery adapter with `@otp-service/provider-sms-twilio` or `@otp-service/provider-email-resend`
3. Build a signer with `hmacOtpSigner(...)`
4. Compose the runtime with `createOtpService(...)`
5. Attach it to your framework package

## Example

```ts
import { createOtpService, hmacOtpSigner } from "@otp-service/core";
import { createRedisChallengeStore } from "@otp-service/redis-store";
import { createTwilioSmsProvider } from "@otp-service/provider-sms-twilio";

const otpService = createOtpService({
  delivery: createTwilioSmsProvider({
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    from: process.env.TWILIO_FROM ?? "",
    httpClient: {
      post: (url, input) => fetch(url, {
        body: input.body,
        headers: input.headers,
        method: "POST"
      })
    }
  }),
  policy: {
    maxVerifyAttempts: 3,
    otpLength: 6,
    ttlSeconds: 600
  },
  signer: hmacOtpSigner({
    secret: process.env.OTP_SECRET ?? ""
  }),
  store: createRedisChallengeStore({
    client: redisClient,
    keyPrefix: "otp:login"
  })
});
```

## Why This Path Exists

The library is intentionally modular. The starter package helps teams move quickly, but it is not the only valid adoption shape.

Advanced consumers should be able to:

- bypass `starter`
- choose their own route composition
- test `core` in isolation
- own their Redis and provider lifecycle explicitly
