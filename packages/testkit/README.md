# @otp-service/testkit

In-memory **`ChallengeStore`**, recording **`OtpDelivery`**, deterministic OTP generator, and fixed clock helper — intended for **tests and local examples**, not production.

**ESM only** · **Node.js ≥ 22** · **License:** MIT

## Install

```bash
npm install --save-dev @otp-service/testkit @otp-service/core
```

Use **`--save-dev`** so test doubles are not pulled into production installs unless you intend to.

## Usage

```ts
import { createOtpService, hmacOtpSigner } from "@otp-service/core";
import {
  InMemoryChallengeStore,
  RecordingDelivery,
  createDeterministicOtpGenerator
} from "@otp-service/testkit";

const delivery = new RecordingDelivery();
const generator = createDeterministicOtpGenerator(["123456"]);
const otpService = createOtpService({
  store: new InMemoryChallengeStore(),
  delivery,
  otpGenerator: () => generator.nextOtp(),
  signer: hmacOtpSigner({ secret: "test-secret" }),
  policy: { maxVerifyAttempts: 3, otpLength: 6, ttlSeconds: 600 }
});

// After generateChallenge:
expect(delivery.lastRequest().otp).toBe("123456");
```

## Exports

| Export | Purpose |
|--------|---------|
| `InMemoryChallengeStore` | Volatile `ChallengeStore` |
| `RecordingDelivery` | Captures `DeliveryRequest[]` / `lastRequest()` |
| `createDeterministicOtpGenerator` | Predictable OTP sequence |
| `createFixedClock` | Time-dependent tests |

## Related packages

- [`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core)

## Links

- Repository: [github.com/Suraj-H/otp-service-package-v2](https://github.com/Suraj-H/otp-service-package-v2)
- Issues: [github.com/Suraj-H/otp-service-package-v2/issues](https://github.com/Suraj-H/otp-service-package-v2/issues)
