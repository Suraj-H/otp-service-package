# @otp-service/fastify

Fastify route handlers for OTP **generate** and **verify**, plus a small **error handler** helper, using an [`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core) **`OtpService`**.

**ESM only** · **Node.js ≥ 22** · **License:** MIT

## Install

```bash
npm install @otp-service/fastify @otp-service/core fastify
```

`fastify` is a **peer dependency** (`^5.0.0`).

## Usage

```ts
import Fastify from "fastify";
import {
  createGenerateChallengeHandler,
  createVerifyChallengeHandler,
  fastifyOtpErrorHandler
} from "@otp-service/fastify";

const app = Fastify();
app.post("/otp/generate", createGenerateChallengeHandler({ otpService }));
app.post("/otp/verify", createVerifyChallengeHandler({ otpService }));
app.setErrorHandler(fastifyOtpErrorHandler);
```

### Request bodies

Same contract as Express helpers: **generate** expects `channel`, `purpose`, `recipient`; **verify** expects `challengeId`, `otp`. Optional **`mapBody`** customizes parsing.

## Exports

| Export | Purpose |
|--------|---------|
| `createGenerateChallengeHandler` | Fastify route handler |
| `createVerifyChallengeHandler` | Fastify route handler |
| `fastifyOtpErrorHandler` | Maps validation errors to HTTP responses |
| `FastifyOtpValidationError` | Validation error type |

## Related packages

- [`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core)
- [`@otp-service/express`](https://www.npmjs.com/package/@otp-service/express) — same HTTP semantics on Express
- Guide: [docs/guides/frameworks/fastify.md](https://github.com/Suraj-H/otp-service-package/blob/main/docs/guides/frameworks/fastify.md)

## Links

- Repository: [github.com/Suraj-H/otp-service-package](https://github.com/Suraj-H/otp-service-package)
- Issues: [github.com/Suraj-H/otp-service-package/issues](https://github.com/Suraj-H/otp-service-package/issues)
