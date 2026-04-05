# Nest SMS Example

This example shows how to wire the OTP core into a Nest application using a dynamic OTP module.

## Run

```bash
pnpm install
pnpm --dir examples/nest-sms dev
```

Verification:

```bash
pnpm exec vitest run tests/integration/core-nest.test.ts
```

The example uses the testkit in-memory store and recording delivery so the flow is easy to inspect locally.
