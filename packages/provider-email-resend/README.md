# @otp-service/provider-email-resend

**`OtpDelivery`** adapter that sends OTP challenges via the [Resend](https://resend.com/) HTTP API. Implements [`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core) delivery contract.

**ESM only** · **Node.js ≥ 22** · **License:** MIT

## Install

```bash
npm install @otp-service/provider-email-resend @otp-service/core
```

## Usage

You supply a thin **`ResendHttpClient`** (typically `fetch`) and API configuration. The factory returns an **`OtpDelivery`** you pass to **`createOtpService`**.

```ts
import { createResendEmailProvider } from "@otp-service/provider-email-resend";

const delivery = createResendEmailProvider({
  apiKey: process.env.RESEND_API_KEY!,
  from: "OTP <otp@yourdomain.com>",
  httpClient: {
    post: (url, input) =>
      fetch(url, {
        method: "POST",
        headers: input.headers,
        body: input.body
      }).then(async (response) => ({
        json: () => response.json(),
        status: response.status
      }))
  }
});
```

See **`CreateResendEmailProviderOptions`** in **`dist/index.d.ts`** for full fields (subject template, etc.).

## Security

- Store **`apiKey`** in secrets, never in client-side code.
- Use a verified sending domain in Resend.

## Related packages

- [`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core)
- [`@otp-service/starter`](https://www.npmjs.com/package/@otp-service/starter) — **`createResendEmailOtpService`** composition

## Links

- Repository: [github.com/Suraj-H/otp-service-package-v2](https://github.com/Suraj-H/otp-service-package-v2)
- Issues: [github.com/Suraj-H/otp-service-package-v2/issues](https://github.com/Suraj-H/otp-service-package-v2/issues)
