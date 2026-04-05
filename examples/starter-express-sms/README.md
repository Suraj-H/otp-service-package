# Starter Express SMS Example

This example shows the intended quickstart path: use `@otp-service/starter` to compose a Twilio + Redis-backed OTP service, then attach it to Express with `@otp-service/express`.

## Run

```bash
pnpm install
pnpm --dir examples/starter-express-sms dev
```

Verification:

```bash
pnpm exec vitest run tests/integration/starter-express.test.ts
```

## Routes

- `POST /otp/generate`
- `POST /otp/verify`
- `GET /otp/debug/deliveries`

The example uses in-memory test doubles for Redis and Twilio so the flow is easy to inspect locally without external infrastructure.
