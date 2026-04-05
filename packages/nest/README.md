# @otp-service/nest

NestJS **`DynamicModule`** factory and controller helper to expose OTP **generate** / **verify** routes backed by an [`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core) **`OtpService`**.

**ESM only** · **Node.js ≥ 22** · **License:** MIT

## Install

```bash
npm install @otp-service/nest @otp-service/core @nestjs/common @nestjs/core reflect-metadata rxjs
```

Peers: **`@nestjs/common`** and **`@nestjs/core`** `^11.0.0`. Use **`reflect-metadata`** and **`rxjs`** as required by your Nest app.

## Usage

Pass a ready-built **`OtpService`** from [`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core). The dynamic module registers the controller and the service token internally.

```ts
import { Module } from "@nestjs/common";
import { createNestOtpModule } from "@otp-service/nest";

@Module({
  imports: [createNestOtpModule({ otpService, pathPrefix: "otp" })]
})
export class AppModule {}
```

For tests or advanced wiring you can also use **`createOtpController(pathPrefix)`** and **`OTP_SERVICE_TOKEN`**; see **`CreateNestOtpModuleOptions`** in **`dist/index.d.ts`**.

## Exports

| Export | Purpose |
|--------|---------|
| `createNestOtpModule` | `DynamicModule` with controller + `OtpService` provider |
| `createOtpController` | Standalone controller class factory |
| `OTP_SERVICE_TOKEN` | DI token for `OtpService` |

## Related packages

- [`@otp-service/core`](https://www.npmjs.com/package/@otp-service/core)
- Guide: [docs/guides/frameworks/nest.md](https://github.com/Suraj-H/otp-service-package-v2/blob/main/docs/guides/frameworks/nest.md)

## Links

- Repository: [github.com/Suraj-H/otp-service-package-v2](https://github.com/Suraj-H/otp-service-package-v2)
- Issues: [github.com/Suraj-H/otp-service-package-v2/issues](https://github.com/Suraj-H/otp-service-package-v2/issues)
