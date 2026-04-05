# Implementation Plan: OTP Infrastructure Package Family for Node.js

## Implementation status (living)

**Last reviewed:** 2026-04-05

Work in this repository is **substantially complete** relative to the task list below: all nine packages, examples, integration tests, publishability verification, and the guide set under `docs/guides/` are in place. Checklist items in the markdown are the original tracking format; treat this section as the source of truth for “done vs not done.”

**Remaining before a formal release:** run [docs/release-readiness-checklist.md](../release-readiness-checklist.md) end-to-end; add GitHub secret `**NPM_TOKEN`** and confirm `**pnpm sync-repo-url`** matches your remote; optional example smoke jobs in CI.

**How to land or extend work in reviewable chunks:** [docs/guides/phase-pr-playbook.md](../guides/phase-pr-playbook.md) (branches, PR boundaries, atomic commits, context brain dumps per phase). **First commit:** [docs/guides/initial-import.md](../guides/initial-import.md). Persistent agent context: [AGENTS.md](../../AGENTS.md).

---

## Overview

This plan turns the OTP infrastructure spec into an ordered, verifiable implementation path. The goal is to build a modular TypeScript package family for in-process OTP generation and verification with Redis-backed challenge state, one SMS adapter, one email adapter, and framework integrations for `Express`, `Fastify`, and `Nest`. The plan favors strong foundations first, then vertical slices that produce working end-to-end adoption paths early.

## Architecture Decisions

### Toolchain Recommendation

#### 1. Workspace / Package Manager

Options considered:

- `pnpm` workspaces
- `npm` workspaces

Recommendation:

- Use `pnpm` workspaces

Why:

- Better monorepo ergonomics and dependency isolation for a multi-package library family
- Faster and more space-efficient installs
- Strong filtering support for package-scoped workflows
- Better fit for examples, integration packages, and a future public-quality publish flow

Why not `npm` workspaces:

- Simpler by default, but weaker day-to-day ergonomics for larger package families
- Less pleasant package filtering and multi-package developer workflow
- Good enough for a small monorepo, but not the best choice for this repo’s intended package surface

#### 2. Task Orchestration

Options considered:

- `turbo`
- native workspace scripts

Recommendation:

- Start with native workspace scripts in v1

Why:

- The repo is not yet large enough to justify orchestration overhead
- Avoids introducing another layer before we have expensive build/test pipelines
- Keeps commands obvious and reduces toolchain surface during the most design-sensitive stage

When to add `turbo` later:

- If example apps, E2E tests, and package builds become slow enough that remote/local caching materially improves the workflow
- If the package family expands beyond the MVP packages and native scripts become noisy or repetitive

Why not `turbo` now:

- It optimizes scale before the repository has earned the complexity
- Native scripts are enough for a first multi-package OSS-quality library build

#### 3. Build Tooling

Options considered:

- `tsup`
- `unbuild`
- `tsdown` or equivalent newer TypeScript bundler

Recommendation:

- Use `tsup`

Why:

- Mature and straightforward for TypeScript library packaging
- Strong support for declaration generation and multi-entry package builds
- Well-understood for package families targeting Node.js
- Lower risk than adopting a newer bundler for security-sensitive infrastructure code

Why not `unbuild`:

- Strong option for framework ecosystems, but adds more abstraction than needed here
- Less direct for a greenfield repo where we want explicit packaging behavior

Why not `tsdown`:

- Interesting, but not worth taking ecosystem/tooling risk for foundational infra packages yet

#### 4. Test Tooling

Options considered:

- `vitest`
- `jest`

Recommendation:

- Use `vitest`

Why:

- Fast feedback loop
- Excellent TypeScript ergonomics
- Good fit for library unit/integration tests
- Simpler modern default for a new TypeScript monorepo

Why not `jest`:

- Battle-tested, but heavier and more legacy-config-oriented for a greenfield setup
- Less attractive unless the repo already depends on Jest conventions

### Concrete Toolchain Recommendation

- Workspace manager: `pnpm`
- Orchestration: native workspace scripts
- Build: `tsup`
- Test: `vitest`
- Versioning/release prep: `changesets`

### Resulting Commands

These are the commands the scaffold should support:

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
pnpm typecheck
pnpm --filter @otp-service/core test
pnpm --filter @otp-service/express test
```

## Dependency Graph

```text
Workspace + shared config
    |
    +-- Package conventions + release config
    |
    +-- Core domain package
    |      |
    |      +-- Redis store adapter
    |      |
    |      +-- SMS/email provider contracts
    |      |      |
    |      |      +-- Real provider adapters
    |      |
    |      +-- Testkit package
    |
    +-- Framework integrations
    |      +-- Express
    |      +-- Fastify
    |      +-- Nest
    |
    +-- Starter package
    |
    +-- Examples
    |
    +-- Cross-package integration tests and publishability checks
```

Implementation order follows this graph bottom-up: build shared workspace foundations first, then the core, then one complete end-to-end slice, then expand across frameworks and channels.

## Task List

### Phase 1: Foundation

## Task 1: Finalize workspace and release tooling

**Description:** Choose and wire the monorepo toolchain around `pnpm`, native workspace scripts, `tsup`, `vitest`, and `changesets`, including root configuration for build, lint, test, and typecheck workflows.

**Acceptance criteria:**

- Root workspace is configured for multi-package development
- Shared commands exist for build, test, lint, and typecheck
- Versioning/release prep uses a documented `changesets` workflow

**Verification:**

- Install succeeds: `pnpm install`
- Root commands resolve: `pnpm build`, `pnpm test`, `pnpm typecheck`
- Manual check: repository has a documented workspace structure and release path

**Dependencies:** None

**Files likely touched:**

- `package.json`
- `pnpm-workspace.yaml`
- `tsconfig.json`
- `tsup` config files
- `vitest` config files
- `.changeset/config.json`
- `README.md`

**Estimated scope:** Medium

## Task 2: Create shared package conventions and base configs

**Description:** Establish shared TypeScript, linting, package export, and testing conventions used by all packages so that later package tasks stay small and consistent.

**Acceptance criteria:**

- Shared TS config is reusable across packages
- Package template conventions for exports/types/build output are defined
- Test and lint configuration can be inherited by package-level configs

**Verification:**

- Typecheck succeeds: `pnpm typecheck`
- Lint succeeds: `pnpm lint`
- Manual check: creating a new package requires minimal package-specific boilerplate

**Dependencies:** Task 1

**Files likely touched:**

- `tsconfig.base.json`
- root lint config
- root test config
- package template docs

**Estimated scope:** Small

### Checkpoint: Foundation

- Root workspace commands run cleanly
- Shared config supports adding packages without ad hoc setup
- Human review confirms the toolchain recommendation is acceptable

### Phase 2: Core Vertical Slice

## Task 3: Implement the core OTP domain package

**Description:** Build the framework-agnostic core package containing challenge lifecycle logic, OTP policies, hashing/signing abstraction, result types, and verification behavior.

**Acceptance criteria:**

- Core package exposes `generateChallenge` and `verifyChallenge`-style APIs
- OTPs are never stored as plaintext in core-controlled data structures
- Verification outcomes are represented with typed result objects

**Verification:**

- Core tests pass: `pnpm --filter @otp-service/core test`
- Core builds: `pnpm --filter @otp-service/core build`
- Manual check: core has no framework-specific dependency

**Dependencies:** Task 2

**Files likely touched:**

- `packages/core/src/`*
- `packages/core/package.json`
- `packages/core/test/`*

**Estimated scope:** Medium

## Task 4: Implement Redis store adapter

**Description:** Build the Redis-backed challenge store package and verify it interoperates correctly with the core package’s challenge lifecycle and TTL semantics.

**Acceptance criteria:**

- Challenge state persists in Redis with expiry support
- Attempt tracking and challenge deletion rules match the core contract
- Store adapter integrates with the core package in tests

**Verification:**

- Redis store tests pass: `pnpm --filter @otp-service/redis-store test`
- Integration tests pass for core + Redis path
- Manual check: persisted values do not expose plaintext OTPs

**Dependencies:** Task 3

**Files likely touched:**

- `packages/redis-store/src/`*
- `packages/redis-store/test/`*
- `tests/integration/`*

**Estimated scope:** Medium

## Task 5: Build testkit package with fake providers and deterministic fixtures

**Description:** Create testing utilities that support deterministic OTP flows, fake SMS/email transports, and reusable integration harnesses for later package and example verification.

**Acceptance criteria:**

- Fake providers exist for SMS and email
- Tests can run deterministic OTP scenarios without real provider calls
- Integration helpers are reusable by framework packages and examples

**Verification:**

- Testkit tests pass: `pnpm --filter @otp-service/testkit test`
- Integration tests use testkit utilities successfully
- Manual check: framework/example tests do not require real delivery services

**Dependencies:** Task 3

**Files likely touched:**

- `packages/testkit/src/`*
- `packages/testkit/test/`*
- shared integration helpers

**Estimated scope:** Small

### Checkpoint: Core Vertical Slice

- Core + Redis + testkit produce a working in-process OTP flow
- Security-sensitive test cases pass
- Human review confirms core public API direction before adapters expand

### Phase 3: Delivery Adapters

## Task 6: Define provider interfaces and implement the SMS adapter

**Description:** Finalize the provider contract and implement the single v1 SMS adapter against that contract.

**Acceptance criteria:**

- Provider interface is stable and documented
- SMS adapter supports the core send flow
- Adapter errors are mapped into predictable package-level behavior

**Verification:**

- SMS adapter tests pass
- Integration tests pass for core + Redis + SMS adapter
- Manual check: the adapter can be swapped with a fake provider without changing core behavior

**Dependencies:** Tasks 3, 4, 5

**Files likely touched:**

- `packages/core/src/provider-contracts/`*
- `packages/provider-sms-*/src/`*
- `packages/provider-sms-*/test/`*

**Estimated scope:** Medium

## Task 7: Implement the email adapter

**Description:** Implement the single v1 email adapter using the same provider contract, keeping the channel-specific behavior thin and contract-driven.

**Acceptance criteria:**

- Email adapter conforms to the shared provider contract
- Email delivery flow is covered in integration tests
- Channel-specific configuration remains isolated to the adapter package

**Verification:**

- Email adapter tests pass
- Integration tests pass for core + Redis + email adapter
- Manual check: SMS and email adapters remain symmetric at the contract level

**Dependencies:** Task 6

**Files likely touched:**

- `packages/provider-email-*/src/`*
- `packages/provider-email-*/test/`*
- `tests/integration/`*

**Estimated scope:** Small

### Checkpoint: Delivery Adapters

- Both v1 delivery channels work against the same core contract
- Fake and real adapters are interchangeable in tests
- Human review confirms provider API is stable enough to build framework helpers on top

### Phase 4: Framework Vertical Slices

## Task 8: Implement Express integration and example

**Description:** Build the Express package with route-building helpers and an example app demonstrating a full generate/verify OTP flow.

**Acceptance criteria:**

- Express helpers expose an idiomatic integration surface
- Example app demonstrates generate and verify flows end-to-end
- Express tests cover success and failure paths

**Verification:**

- Express package tests pass: `pnpm --filter @otp-service/express test`
- Example build/test passes
- Manual check: a consumer can wire routes without adopting a fixed HTTP contract

**Dependencies:** Tasks 4, 5, 6

**Files likely touched:**

- `packages/express/src/`*
- `packages/express/test/`*
- `examples/express-sms/`*

**Estimated scope:** Medium

## Task 9: Implement Fastify integration and example

**Description:** Build the Fastify package and example app using the same core abstractions while preserving Fastify-native ergonomics.

**Acceptance criteria:**

- Fastify integration is idiomatic and framework-native
- Example app demonstrates the OTP flow end-to-end
- Tests cover integration success and failure states

**Verification:**

- Fastify package tests pass: `pnpm --filter @otp-service/fastify test`
- Example build/test passes
- Manual check: Fastify package does not duplicate core business logic

**Dependencies:** Tasks 4, 5, 6

**Files likely touched:**

- `packages/fastify/src/`*
- `packages/fastify/test/`*
- `examples/fastify-email/`*

**Estimated scope:** Medium

## Task 10: Implement Nest integration and example

**Description:** Build the Nest module/integration package and a sample app showing OTP usage through Nest-native configuration and provider wiring.

**Acceptance criteria:**

- Nest integration exposes a clean module/provider story
- Example app demonstrates generate and verify flows end-to-end
- Tests cover Nest-specific integration behavior

**Verification:**

- Nest package tests pass: `pnpm --filter @otp-service/nest test`
- Example build/test passes
- Manual check: Nest integration remains a wrapper over the core, not a second implementation

**Dependencies:** Tasks 4, 5, 6

**Files likely touched:**

- `packages/nest/src/`*
- `packages/nest/test/`*
- `examples/nest-sms/`*

**Estimated scope:** Medium

### Checkpoint: Framework Integrations

- `Express`, `Fastify`, and `Nest` all have working examples
- Integration tests cover the main OTP lifecycle across frameworks
- Human review confirms framework package shapes before starter package consolidation

### Phase 5: Adoption Layer and Publishability

## Task 11: Implement starter package

**Description:** Build the starter package that re-exports the most common adoption path while staying intentionally thin over the underlying packages.

**Acceptance criteria:**

- Starter package makes the happy path simpler than assembling every package manually
- Starter package does not hide critical security configuration
- Documentation uses the starter package for quickstart flows

**Verification:**

- Starter package tests pass
- Quickstart example works using the starter package
- Manual check: advanced consumers can still drop to lower-level packages without friction

**Dependencies:** Tasks 8, 9, 10

**Files likely touched:**

- `packages/starter/src/`*
- `packages/starter/test/`*
- docs/examples

**Estimated scope:** Small

## Task 12: Add cross-package publishability checks and package metadata hardening

**Description:** Harden package exports, types, release metadata, and compatibility checks so the monorepo is public-quality even before public release.

**Acceptance criteria:**

- Package exports are explicit and tested
- Type declarations are generated and consumable
- Release/version metadata is consistent across packages

**Verification:**

- Build succeeds across all packages: `pnpm build`
- Typecheck succeeds across all packages: `pnpm typecheck`
- Manual check: example consumers import packages without path hacks

**Dependencies:** Tasks 8, 9, 10, 11

**Files likely touched:**

- package manifests across `packages/`*
- build configs
- release config
- publishability tests

**Estimated scope:** Medium

## Task 13: Complete docs and adoption guides

**Description:** Write the internal-first, public-quality documentation set including quickstarts, package roles, security notes, and migration guidance from a service-based mental model.

**Acceptance criteria:**

- Quickstart docs exist for starter package and at least one direct package path
- Security notes explain OTP storage, secrets, and logging behavior
- Framework-specific adoption docs exist for `Express`, `Fastify`, and `Nest`

**Verification:**

- Doc examples are exercised in CI or scripted verification
- Manual check: a new engineer can follow the docs to run a working example
- Build/test commands referenced in docs are accurate

**Dependencies:** Tasks 11, 12

**Files likely touched:**

- `README.md`
- `docs/`*
- example app docs

**Estimated scope:** Medium

### Checkpoint: Complete

- All package builds, tests, and typechecks pass
- Working OTP flows exist for `Express`, `Fastify`, and `Nest`
- Security and publishability checks pass
- Human review approves the repo for implementation continuation or internal adoption

## Risks and Mitigations


| Risk                                                            | Impact | Mitigation                                                                                                     |
| --------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------- |
| Core API grows too large before real usage feedback             | High   | Freeze a minimal core early and push convenience outward into starter/framework packages                       |
| Framework packages start duplicating business logic             | High   | Keep OTP lifecycle logic exclusively in `core`; review package boundaries at each framework task               |
| Provider abstraction becomes too generic                        | Medium | Support exactly one SMS and one email provider in v1 and design around real adapters, not hypothetical breadth |
| Toolchain churn delays actual product work                      | Medium | Choose `pnpm` + native scripts + `tsup` + `vitest` up front and avoid premature orchestration                  |
| Publishability requirements introduce packaging edge cases late | Medium | Add explicit publishability checks before docs/final polish, not after release prep                            |
| Security guarantees are assumed rather than verified            | High   | Add security-focused tests at core and integration levels before framework expansion                           |


## Open Questions

- Which SMS provider should be the single v1 default adapter?
- Which email provider should be the single v1 default adapter?
- Should the starter package re-export framework helpers directly or only re-export shared setup helpers?
- What Node.js LTS versions should the first release support?

## Recommended Next Step

Start implementation with **Task 1: Finalize workspace and release tooling**. That is the smallest high-leverage step and it locks the repo shape before any package APIs are written.