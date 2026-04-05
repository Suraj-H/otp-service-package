# @otp-service/core

Framework-agnostic OTP challenge lifecycle for Node.js: generate a challenge, deliver the OTP out-of-band, verify attempts with policy (TTL, length, max attempts), and persist state behind a small store interface.

**ESM only** · **Node.js ≥ 22** · **License:** MIT

## Install

```bash
npm install @otp-service/core
```

## When to use this package

Use `**@otp-service/core**` when you want full control over storage, delivery, signing, and OTP generation. Pair it with:

- `[@otp-service/redis-store](https://www.npmjs.com/package/@otp-service/redis-store)` for Redis persistence
- `[@otp-service/provider-email-resend](https://www.npmjs.com/package/@otp-service/provider-email-resend)` or `[@otp-service/provider-sms-twilio](https://www.npmjs.com/package/@otp-service/provider-sms-twilio)` for delivery
- `[@otp-service/express](https://www.npmjs.com/package/@otp-service/express)`, `[@otp-service/fastify](https://www.npmjs.com/package/@otp-service/fastify)`, or `[@otp-service/nest](https://www.npmjs.com/package/@otp-service/nest)` for HTTP routes

For a pre-wired Redis + provider path, see `[@otp-service/starter](https://www.npmjs.com/package/@otp-service/starter)`.

## Minimal usage

You must supply a `**ChallengeStore**`, `**OtpDelivery**`, `**OtpSigner**`, and `**OtpPolicy**`. The service exposes `**generateChallenge**` and `**verifyChallenge**`.

```ts
import { createOtpService, hmacOtpSigner } from "@otp-service/core";

const otpService = createOtpService({
  delivery: myDelivery,
  otpGenerator: (length) => {
    /* return numeric string of length */
  },
  policy: {
    maxVerifyAttempts: 3,
    otpLength: 6,
    ttlSeconds: 600
  },
  signer: hmacOtpSigner({ secret: process.env.OTP_SECRET! }),
  store: myStore
});

await otpService.generateChallenge({
  channel: "email",
  purpose: "LOGIN",
  recipient: "user@example.com"
});
```

## Main exports


| Export                                                  | Role                                 |
| ------------------------------------------------------- | ------------------------------------ |
| `createOtpService`                                      | Build the headless OTP service       |
| `hmacOtpSigner`                                         | HMAC-based OTP hashing for storage   |
| `OtpDeliveryError`                                      | Typed delivery failure from adapters |
| Types: `ChallengeStore`, `OtpDelivery`, `OtpService`, … | Implement or consume contracts       |


See **TypeScript definitions** in the published `dist/` for full shapes.

## Documentation

- Monorepo overview: [github.com/Suraj-H/otp-service-package-v2](https://github.com/Suraj-H/otp-service-package-v2)
- Security notes: [docs/guides/security.md](https://github.com/Suraj-H/otp-service-package-v2/blob/main/docs/guides/security.md)
- Issues: [github.com/Suraj-H/otp-service-package-v2/issues](https://github.com/Suraj-H/otp-service-package-v2/issues)

## Stability

**0.x** — APIs may evolve; pin versions in production until you are comfortable with upgrades.