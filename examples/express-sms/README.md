# Express SMS Example

This example shows how to wire the OTP core into an Express application without adopting a fixed service contract.

## Run

```bash
pnpm install
pnpm --dir examples/express-sms dev
```

Verification:

```bash
pnpm exec vitest run tests/integration/core-express.test.ts
```

## Routes

- `POST /otp/generate`
- `POST /otp/verify`
- `GET /otp/debug/deliveries`

The example uses the testkit in-memory store and recording delivery so the flow is easy to inspect locally.
