# @otp-service/redis-store

Redis-backed implementation of [`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core) **`ChallengeStore`** for OTP challenge records (create, get, update, delete).

**ESM only** · **Node.js ≥ 22** · **License:** MIT

## Install

```bash
npm install @otp-service/redis-store @otp-service/core
```

Bring your own **Redis client** that matches the small **`RedisStoreClient`** interface (string get/set/del with optional TTL on set).

## Usage

```ts
import { createRedisChallengeStore } from "@otp-service/redis-store";

const store = createRedisChallengeStore({
  client: redisClient,
  keyPrefix: "otp:myapp"
});

const otpService = createOtpService({
  store,
  delivery,
  signer,
  policy,
  /* ... */
});
```

Implement **`RedisStoreClient`** for **`ioredis`**, **`node-redis`**, or any client that can implement **`get`**, **`set`** (with expiration), and **`del`**.

## Exports

| Export | Purpose |
|--------|---------|
| `createRedisChallengeStore` | Factory returning a `ChallengeStore` |
| `RedisStoreClient` | Port your Redis driver implements |
| `CreateRedisChallengeStoreOptions` | Configuration type |

## Related packages

- [`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core)
- [`@otp-service/starter`](https://www.npmjs.com/package/@otp-service/starter) — wires Redis + providers for you

## Links

- Repository: [github.com/Suraj-H/otp-service-package](https://github.com/Suraj-H/otp-service-package)
- Issues: [github.com/Suraj-H/otp-service-package/issues](https://github.com/Suraj-H/otp-service-package/issues)
