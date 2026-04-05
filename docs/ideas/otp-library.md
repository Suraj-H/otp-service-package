# OTP Infrastructure for Node.js

## Problem Statement
How might we give Node.js/TypeScript services a production-grade OTP capability with strong security and minimal operational overhead, without introducing a separate OTP microservice?

## Recommended Direction
Build a modular OTP package family for Node.js, centered on a small audited core and surrounded by optional adapters for Redis, SMS/email providers, and framework integrations.

The core should own the hard parts: challenge creation, OTP generation, HMAC-based hashing, TTL semantics, attempt tracking, verification rules, masking, and structured error outcomes. Redis should remain the system of record for short-lived challenge state, but the consuming service should provide the Redis connection and choose its own provider configuration.

To optimize for adoption, ship a starter SDK layer that makes the common path trivial for internal teams. This gives you the simplicity benefits of a library without forcing every team to compose primitives manually. Architecturally, this preserves a clean headless core while still delivering a batteries-included developer experience.

This is better than starting with a microservice because the microservice solves the wrong problem first. It centralizes deployment and networking before there is evidence that centralization is needed. In this case, the simplest reliable thing is in-process OTP logic with shared guarantees.

## Product Shape
Recommended package family:

- `@otp-service/core`
- `@otp-service/redis-store`
- `@otp-service/provider-sms-twilio`
- `@otp-service/provider-email-resend`
- `@otp-service/express`
- `@otp-service/fastify`
- `@otp-service/nest`
- `@otp-service/starter`

The `starter` package should re-export the common happy path so internal teams get fast adoption. The modular packages keep the design clean, externally publishable, and auditable.

## Why This Beats a Microservice for This Context
- No network hop between auth flow and OTP logic
- No separate deployment, on-call surface, or scaling tier to manage
- No central OTP service outage taking down all authentication flows
- Shared, audited logic without forcing centralized runtime ownership
- Framework-native integration for Node.js services
- Redis remains the source of truth, owned by the consuming service

## Key Assumptions to Validate
- [ ] Teams prefer importing a package over calling a central OTP service
  Validation: Interview 5-8 internal backend teams and compare perceived integration effort.
- [ ] A shared package can enforce enough security consistency without a centrally hosted runtime
  Validation: Do a security review of the core API and verify there are no easy unsafe escape hatches.
- [ ] Redis ownership per service is operationally acceptable
  Validation: Check whether target services already run Redis or have access to a shared managed Redis pattern.
- [ ] Framework adapters materially improve adoption
  Validation: Prototype Express and Nest integrations and measure time-to-first-working-flow.
- [ ] External teams will accept provider/store adapters instead of expecting a hosted OTP API
  Validation: Publish docs/examples and gather feedback from 2-3 external-friendly consumers.

## MVP Scope
- Headless OTP core
  - generate challenge
  - generate OTP
  - HMAC hash and compare
  - TTL and expiry
  - attempt limits
  - challenge ID model
  - typed result states like `VERIFIED`, `INVALID`, `EXPIRED`, `ATTEMPTS_EXCEEDED`
- Redis store adapter
- One SMS provider adapter
- One email provider adapter
- Framework integrations for Express and Nest
- Security defaults
  - OTP never returned by default
  - no plaintext OTP storage
  - masked logging helpers
  - constant-time comparison
  - configurable secret management hooks
- Observability hooks
  - structured events and metrics callbacks
- Documentation
  - three copy-paste quickstarts

## Not Doing (and Why)
- Standalone OTP microservice
  Reason: Adds operational overhead and latency before there is evidence that centralization is needed.
- Multi-language SDKs
  Reason: Consumers are definitively Node.js/TypeScript, and cross-language support would dilute focus.
- Too many providers in v1
  Reason: Provider breadth is not the core value. One solid SMS and one solid email adapter is enough.
- Built-in secret manager or Vault product
  Reason: The package should integrate with existing secret-management patterns, not become one.
- Cross-region active-active orchestration
  Reason: That is service-scale thinking. The library should inherit infrastructure posture from the host service.
- Admin dashboard or UI
  Reason: Adoption depends on integration simplicity, not another control plane.
- Full authentication platform scope
  Reason: OTP is one job. It should not expand into a general auth framework.

## Open Questions
- Should rate limiting be only per challenge, or also optional per identifier and IP?
- Should the SDK expose route handlers, middleware, or only lower-level framework helpers?
- Do we want test-mode providers and deterministic OTP fixtures for integration tests?
- Should secret rotation support be first-class in v1, or integrated through a narrower signer interface?

## Positioning
Do not frame this as "an OTP library for Node.js." That sounds small and replaceable.

Frame it as production-grade OTP infrastructure for Node.js services:

- secure state handling
- delivery abstraction
- framework integration
- operational simplicity
- shared correctness

## Recommendation in One Sentence
Do not build an OTP microservice first. Build a modular Node.js OTP infrastructure package with a strong starter SDK, and keep the API shaped so it could be wrapped by a service later if that becomes necessary.
