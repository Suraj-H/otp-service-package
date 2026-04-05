# @otp-service/express

Express **`RequestHandler`** factories for OTP **generate** and **verify** JSON endpoints, wired to an [`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core) **`OtpService`**.

**ESM only** · **Node.js ≥ 22** · **License:** MIT

## Install

```bash
npm install @otp-service/express @otp-service/core express
```

`express` is a **peer dependency** (`^4.21.0 || ^5.0.0`).

## Usage

```ts
import express from "express";
import {
  createGenerateChallengeHandler,
  createVerifyChallengeHandler
} from "@otp-service/express";

app.use(express.json());
app.post("/otp/generate", createGenerateChallengeHandler({ otpService }));
app.post("/otp/verify", createVerifyChallengeHandler({ otpService }));
```

### Request bodies

- **POST generate** — `{ "channel": "email" | "sms", "purpose": string, "recipient": string }` → **201** with challenge metadata.
- **POST verify** — `{ "challengeId": string, "otp": string }` → **200** / **400** / **410** / **429** depending on outcome.

Optional **`mapBody`** in handler options adapts your API shape to these inputs.

## Exports

| Export | Purpose |
|--------|---------|
| `createGenerateChallengeHandler` | Express handler for generate |
| `createVerifyChallengeHandler` | Express handler for verify |
| `ExpressOtpValidationError` | Thrown for malformed JSON (mapped to **422** by handlers) |

## Related packages

- [`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core) — build `otpService`
- [`@otp-service/starter`](https://www.npmjs.com/package/@otp-service/starter) — Redis + provider composition
- Framework guides: [docs/guides/frameworks/express.md](https://github.com/Suraj-H/otp-service-package/blob/main/docs/guides/frameworks/express.md)

## Links

- Repository: [github.com/Suraj-H/otp-service-package](https://github.com/Suraj-H/otp-service-package)
- Issues: [github.com/Suraj-H/otp-service-package/issues](https://github.com/Suraj-H/otp-service-package/issues)
