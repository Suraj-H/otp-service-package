# @otp-service/starter

Opinionated factories that compose **[`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core)** with **[`@otp-service/redis-store`](https://www.npmjs.com/package/@otp-service/redis-store)** and a real delivery adapter (**Twilio** SMS or **Resend** email) for the common production path.

**ESM only** · **Node.js ≥ 22** · **License:** MIT

## Install

Install **starter** plus the **framework** package you use for HTTP:

```bash
npm install @otp-service/starter @otp-service/express express
# or: @otp-service/fastify fastify
# or: @otp-service/nest @nestjs/common @nestjs/core
```

Starter already depends on **`@otp-service/core`**, **`redis-store`**, and both provider packages; npm will install them as transitive dependencies.

## When to use

- You want **Redis** for challenge state and a **supported** email/SMS provider with minimal wiring.
- You are okay with starter defaults for policy (length, TTL, max attempts); override via options where exposed.

**Avoid** starter if you need a custom store, custom signer design, or non-Resend/Twilio delivery — assemble **`createOtpService`** manually from **`@otp-service/core`** instead.

## Express example

```ts
import express from "express";
import { createTwilioSmsOtpService } from "@otp-service/starter";
import {
  createGenerateChallengeHandler,
  createVerifyChallengeHandler
} from "@otp-service/express";

const otpService = createTwilioSmsOtpService({
  redis: { client: redisClient, keyPrefix: "otp:login" },
  signerSecret: process.env.OTP_SECRET!,
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID!,
    authToken: process.env.TWILIO_AUTH_TOKEN!,
    from: process.env.TWILIO_FROM!,
    httpClient: { post: (url, i) => fetch(url, { method: "POST", headers: i.headers, body: i.body }).then(...) }
  }
});

const app = express();
app.use(express.json());
app.post("/otp/generate", createGenerateChallengeHandler({ otpService }));
app.post("/otp/verify", createVerifyChallengeHandler({ otpService }));
```

Email path: **`createResendEmailOtpService`** with **`resend`** options — see types in **`dist/index.d.ts`**.

## Exports

| Export | Purpose |
|--------|---------|
| `createTwilioSmsOtpService` | Redis + Twilio + core |
| `createResendEmailOtpService` | Redis + Resend + core |
| `resolvePolicy` / `DEFAULT_OTP_POLICY` | Policy helpers |
| Re-exported **types** from core / redis / providers | Narrow surface for apps |

## More documentation

- [Starter quickstart (monorepo)](https://github.com/Suraj-H/otp-service-package/blob/main/docs/guides/starter-quickstart.md)
- [Security](https://github.com/Suraj-H/otp-service-package/blob/main/docs/guides/security.md)

## Links

- Repository: [github.com/Suraj-H/otp-service-package](https://github.com/Suraj-H/otp-service-package)
- Issues: [github.com/Suraj-H/otp-service-package/issues](https://github.com/Suraj-H/otp-service-package/issues)
