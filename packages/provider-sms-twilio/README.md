# @otp-service/provider-sms-twilio

**`OtpDelivery`** adapter that sends OTP challenges via **Twilio Programmable SMS**. Implements [`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core) delivery contract.

**ESM only** · **Node.js ≥ 22** · **License:** MIT

## Install

```bash
npm install @otp-service/provider-sms-twilio @otp-service/core
```

## Usage

Provide **`TwilioHttpClient`** (usually `fetch` to Twilio’s API), account credentials, and **`from`** number.

```ts
import { createTwilioSmsProvider } from "@otp-service/provider-sms-twilio";

const delivery = createTwilioSmsProvider({
  accountSid: process.env.TWILIO_ACCOUNT_SID!,
  authToken: process.env.TWILIO_AUTH_TOKEN!,
  from: process.env.TWILIO_FROM!,
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

See **`CreateTwilioSmsProviderOptions`** in **`dist/index.d.ts`** for details.

## Security

- Keep **`authToken`** server-side only.
- Prefer Twilio-segmented secrets and least-privilege API keys where available.

## Related packages

- [`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core)
- [`@otp-service/starter`](https://www.npmjs.com/package/@otp-service/starter) — **`createTwilioSmsOtpService`** composition

## Links

- Repository: [github.com/Suraj-H/otp-service-package](https://github.com/Suraj-H/otp-service-package)
- Issues: [github.com/Suraj-H/otp-service-package/issues](https://github.com/Suraj-H/otp-service-package/issues)
