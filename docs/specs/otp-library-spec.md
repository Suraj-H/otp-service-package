# Spec: OTP Infrastructure Package Family for Node.js

## Assumptions
1. This repository is still at the specification stage, so the build and workspace toolchain can be chosen deliberately rather than inherited.
2. The product is a TypeScript package family for Node.js services, not a standalone hosted OTP service.
3. The target consumers are internal backend teams first, but the package family should be structured to become publicly publishable without architectural rework.
4. Redis is the only required OTP state backend for v1.
5. SMS and email are both first-class delivery channels for v1, but provider breadth should remain intentionally narrow.
6. Framework integrations for `Express`, `Fastify`, and `Nest` are all part of MVP.
7. Consuming services should own their HTTP routes and auth boundaries; this package family should provide framework-native helpers, not a prebuilt HTTP service contract.

## Objective
Build a production-grade OTP infrastructure package family for Node.js/TypeScript services that delivers:

- fast internal adoption
- strong security defaults
- low operational overhead
- a clean path to public npm release later

The package family should let services generate and verify OTP challenges in-process while bringing their own Redis connection, provider configuration, and transport boundaries. The core value is not OTP code generation alone; it is shared correctness, secure short-lived state handling, provider abstraction, and framework-native integration without the operational cost of a dedicated OTP microservice.

## Decision Summary

### Public Release Strategy
Design **internal-first with public-quality structure**, not immediate public npm release.

Reasoning:
- OTP is security-sensitive infrastructure. We should prove the API, defaults, and operational ergonomics internally before committing to a public compatibility surface.
- Public release pressure too early will freeze abstractions before we have real usage data.
- Public-quality packaging, docs, versioning, and tests should still be part of v1 architecture so external release is a packaging/governance decision, not a rewrite.

### HTTP Layer Strategy
Provide **framework/plugin-level integrations and route-building helpers**, but do **not** ship a ready-made HTTP API contract as part of the core product.

Reasoning:
- A prebuilt HTTP API starts drifting back toward the microservice model we explicitly chose not to build.
- Different teams will need different auth, input validation, observability, and endpoint conventions.
- What teams want is lower integration effort, not a hidden service template.
- The right middle ground is helpers like `createGenerateOtpHandler()` or framework plugins/modules that wire the core into app-native routes.

### Channel Strategy
Ship **one real SMS adapter and one real email adapter in MVP**.

Reasoning:
- External credibility and internal usefulness both improve materially when the library supports the two most common OTP channels from day one.
- Email is a real use case, not a nice-to-have, for password reset, account recovery, lower-cost verification flows, and non-phone-first products.
- Breadth should still be constrained: one provider each is enough in v1.

## Tech Stack
Tooling is intentionally left open for comparison during planning. The implementation plan must compare at least:

- Workspace/package manager options:
  - `pnpm` workspaces
  - `npm` workspaces
- Task orchestration options:
  - `turbo`
  - native workspace scripts
- Build tooling options:
  - `tsup`
  - `unbuild`
  - `tsdown` or equivalent modern TypeScript bundler
- Test tooling options:
  - `vitest`
  - `jest`

Default implementation language:
- TypeScript targeting supported LTS Node.js releases

Required runtime integrations:
- Redis
- one SMS provider
- one email provider
- `Express`
- `Fastify`
- `Nest`

## Commands
Exact commands will be finalized after toolchain selection. The chosen toolchain must support the following command categories:

```bash
# install dependencies
[workspace install command]

# build all packages
[workspace build command]

# test all packages
[workspace test command]

# run lint checks
[workspace lint command]

# run type checks
[workspace typecheck command]

# run package-specific tests
[workspace package test command]
```

During planning, these commands must be resolved into full executable commands, not placeholders.

## Project Structure
Proposed structure:

```text
docs/
  ideas/
  specs/

packages/
  core/
  redis-store/
  provider-sms-<provider>/
  provider-email-<provider>/
  express/
  fastify/
  nest/
  starter/
  testkit/

examples/
  express-sms/
  fastify-email/
  nest-sms/

tests/
  integration/
  e2e/

.changeset/ or equivalent/
```

Directory intent:
- `packages/core` -> OTP domain logic, policies, challenge lifecycle, typed results, security-sensitive primitives
- `packages/redis-store` -> Redis-backed challenge store implementation
- `packages/provider-*` -> delivery-channel adapters
- `packages/express`, `packages/fastify`, `packages/nest` -> framework-native helpers and integration surfaces
- `packages/starter` -> common re-export layer for fast adoption
- `packages/testkit` -> fake providers, deterministic OTP fixtures, in-memory or test harness utilities
- `examples/` -> minimal end-to-end adoption references
- `tests/integration` -> cross-package verification
- `tests/e2e` -> framework-level workflow checks

## Code Style
Design principles:
- Headless core first
- Explicit configuration over hidden magic
- Typed result objects over exception-driven domain flow
- Safe defaults that are easy to adopt and hard to misuse
- Small public APIs with composable extension points

Illustrative style:

```ts
type VerifyOtpResult =
  | { status: "VERIFIED"; challengeId: string }
  | { status: "INVALID"; attemptsRemaining: number }
  | { status: "EXPIRED" }
  | { status: "ATTEMPTS_EXCEEDED" };

const otp = createOtpService({
  store: redisChallengeStore(redis),
  delivery: twilioSmsProvider(config),
  signer: hmacOtpSigner({ secret: env.OTP_SECRET }),
  policy: {
    ttlSeconds: 600,
    maxGenerateAttempts: 3,
    maxVerifyAttempts: 3,
    otpLength: 6,
  },
});
```

Conventions:
- package names should reflect responsibility, not implementation detail
- domain functions should prefer verbs like `generateChallenge`, `sendChallenge`, `verifyChallenge`
- public exports should be deliberate; avoid wildcard export sprawl
- framework packages should wrap the core, not duplicate OTP logic
- logs and error objects must never expose plaintext OTP values

## Testing Strategy
Testing is part of the product, not cleanup after implementation.

Required test layers:

1. Unit tests
- core policy behavior
- OTP generation and verification rules
- typed result transitions
- masking and logging protections
- provider adapter contract behavior

2. Integration tests
- core + Redis store interaction
- core + provider adapter interaction
- framework integration surfaces for `Express`, `Fastify`, and `Nest`

3. End-to-end examples
- generate flow
- verify success flow
- invalid OTP flow
- expired OTP flow
- attempts exceeded flow

4. Security-focused verification
- plaintext OTP never persisted
- plaintext OTP never logged
- constant-time comparison path exists
- secrets are injected, not hardcoded
- default policies are safe

5. Publishability checks
- package exports resolve correctly
- ESM/CJS strategy is verified explicitly if dual output is chosen
- type declarations are generated and consumable

Test support requirements:
- deterministic test OTP fixtures
- fake SMS and email providers
- Redis-backed integration test path
- framework smoke-test apps

## Boundaries

### Always
- Keep the core package framework-agnostic
- Use typed result states for OTP verification outcomes
- Store only hashed OTP material, never plaintext OTP
- Make Redis the only required persistence layer in v1
- Provide integration tests across all MVP framework packages
- Keep public APIs small and documented
- Validate configuration at package initialization boundaries

### Ask First
- Adding new runtime dependencies with large transitive trees
- Expanding v1 to additional stores beyond Redis
- Adding extra SMS or email providers before the first provider pair is stable
- Changing package boundaries after the spec is approved
- Committing to public npm release before internal validation is complete

### Never
- Return plaintext OTP from production-facing APIs by default
- Log plaintext OTPs
- Couple framework packages directly to provider implementations
- Hide network calls or Redis initialization behind implicit global state
- Expand the package family into a full authentication platform during v1

## Success Criteria
- A Node.js service can adopt the starter package and complete a working OTP flow with Redis plus one provider in under 30 minutes.
- The core package remains framework-agnostic and contains no HTTP framework dependency.
- `Express`, `Fastify`, and `Nest` all have working integration examples and automated verification.
- OTP values are never stored or logged in plaintext in normal production flows.
- The architecture supports internal production use without requiring a dedicated OTP deployment.
- The package family is structured so that public npm release later requires packaging and governance decisions, not architectural redesign.
- The MVP scope remains constrained to OTP generation, delivery coordination, and verification, without expanding into general authentication.

## Open Questions
- Which workspace/build/test toolchain best balances package ergonomics, speed, and publishability?
- Which SMS provider and which email provider should be the single v1 defaults?
- Should the starter package re-export framework helpers directly or stay runtime-agnostic?
- What Node.js version support policy should be declared for the first release?
- Should rate limiting be challenge-only in the core, with identifier/IP policies as optional extensions?
