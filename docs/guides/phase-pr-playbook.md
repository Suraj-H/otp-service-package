# Phase-wise PRs and commits (git workflow + agent context)

This playbook maps [docs/plans/otp-library-implementation-plan.md](../plans/otp-library-implementation-plan.md) **phases** to **short-lived branches**, **PR boundaries**, **atomic commit patterns**, and **context-engineering brain dumps** so humans and agents stay aligned with [trunk-based development](https://martinfowler.com/articles/branching-patterns.html) and reviewable history.

## When to use this

- **Greenfield / replay:** Land work as **one PR per phase** (or split a large phase into 2 PRs max), merging to `main` in plan order.
- **Already-unified tree:** The repo may already contain all phases; use this for **future** work (group changes by phase) and for **documentation of intent**. You cannot recover fake phase history without splitting the tree artificially—prefer **one initial commit** using [initial-import.md](initial-import.md), then **strict phase PRs from here on**.
- **Agents:** At the start of each phase, paste the **Phase brain dump** for that phase into the session (selective include). Do not load the full plan unless the task spans phases.

## Global rules (every phase)

| Rule | Detail |
|------|--------|
| Base branch | `main` must stay green; branch from latest `main` |
| Branch lifetime | Merge within **1–3 days**; delete branch after merge |
| Naming | `phase/N-short-name` or `feature/…` / `fix/…` per [CONTRIBUTING.md](../../CONTRIBUTING.md) |
| PR size | Target **&lt; ~300 lines** net per PR when possible; split phase if larger |
| Commits inside PR | **Atomic:** one logical change per commit (`feat:`, `fix:`, `test:`, `docs:`, `chore:`) |
| Before push | `pnpm lint && pnpm typecheck && pnpm test` (CI is the backstop) |
| Release notes | User-facing package changes: add a **Changeset** in the same PR (`pnpm changeset`) |

### PR description template (all phases)

```markdown
## Phase
Phase N — <name> (see docs/plans/otp-library-implementation-plan.md)

## Intent
<one paragraph>

## Verification
<paste commands from phase section below>

## Out of scope
<what this PR deliberately does not do>
```

### Open a PR (GitHub CLI)

```bash
git checkout main && git pull
git checkout -b phase/N-short-name
# … commits …
git push -u origin HEAD
gh pr create --base main --title "feat: phase N — <short title>" --body-file .github/PULL_REQUEST_PHASE_N.md
```

(Use any body; file is optional.)

---

## Phase 1 — Foundation

**Plan:** Tasks 1–2 — workspace, shared configs, Changesets, conventions.

**Suggested branch:** `phase/1-foundation`

**Typical paths:** `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig*.json`, `eslint.config.mjs`, `tooling/`, `.changeset/`, `docs/conventions/`, root `README` stub.

### Commit pattern (example sequence)

1. `chore: add pnpm workspace and root toolchain`
2. `chore: add shared tsconfig and eslint`
3. `docs: add package template conventions`
4. `chore: add changesets config`

### Verification

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### Phase brain dump (paste for agents)

```text
PHASE: 1 Foundation
GOAL: Monorepo shell only — no framework OTP logic yet.
LOAD: docs/conventions/package-template.md, package.json, tsconfig.base.json
CONSTRAINTS: ESM, Node >=22, pnpm workspaces; no secrets in repo.
VERIFY: pnpm install, lint, typecheck, test, build from root.
OUT OF SCOPE: packages/core, adapters, examples with real OTP flows.
```

---

## Phase 2 — Core vertical slice

**Plan:** Tasks 3–5 — `@otp-service/core`, `redis-store`, `testkit`, integration `core-redis` / `core-testkit`.

**Suggested branch:** `phase/2-core-slice`

**Typical paths:** `packages/core/`, `packages/redis-store/`, `packages/testkit/`, `tests/integration/core-redis.test.ts`, `tests/integration/core-testkit.test.ts`, root `vitest.config.ts` aliases if needed.

### Commit pattern

1. `feat(core): add OTP domain API and tests`
2. `feat(redis-store): add Redis challenge store`
3. `feat(testkit): add fakes and fixtures`
4. `test: add core+redis and core+testkit integration tests`

### Verification

```bash
pnpm --filter @otp-service/core test
pnpm --filter @otp-service/redis-store test
pnpm --filter @otp-service/testkit test
pnpm exec vitest run tests/integration/core-redis.test.ts tests/integration/core-testkit.test.ts
```

### Phase brain dump

```text
PHASE: 2 Core vertical slice
GOAL: Headless OTP lifecycle + persistence + test doubles; no HTTP frameworks.
LOAD: docs/specs/otp-library-spec.md (domain + store sections), packages/core/src/index.ts
CONSTRAINTS: OTPs not stored plaintext; ChallengeStore contract is source of truth.
VERIFY: core, redis-store, testkit tests + listed integration tests.
OUT OF SCOPE: Twilio/Resend real adapters, Express/Fastify/Nest.
```

---

## Phase 3 — Delivery adapters

**Plan:** Tasks 6–7 — Twilio SMS, Resend email, contracts in core if applicable, integration tests.

**Suggested branch:** `phase/3-delivery-adapters`

**Typical paths:** `packages/provider-sms-twilio/`, `packages/provider-email-resend/`, `tests/integration/core-twilio.test.ts`, `tests/integration/core-resend.test.ts`.

### Commit pattern

1. `feat(sms): add Twilio OTP delivery adapter`
2. `feat(email): add Resend OTP delivery adapter`
3. `test: add adapter integration tests`

### Verification

```bash
pnpm --filter @otp-service/provider-sms-twilio test
pnpm --filter @otp-service/provider-email-resend test
pnpm exec vitest run tests/integration/core-twilio.test.ts tests/integration/core-resend.test.ts
```

### Phase brain dump

```text
PHASE: 3 Delivery adapters
GOAL: Real v1 adapters behind OtpDelivery; symmetric error mapping.
LOAD: docs/decisions/ADR-002-v1-delivery-providers.md, packages/core (Delivery types)
CONSTRAINTS: Thin adapters; core owns lifecycle; no secrets in code.
VERIFY: adapter unit + integration tests.
OUT OF SCOPE: Second SMS/email provider, HTTP servers.
```

---

## Phase 4 — Framework integrations

**Plan:** Tasks 8–10 — `express`, `fastify`, `nest`, examples, integration tests.

**Suggested branch:** `phase/4-express` then `phase/4-fastify` then `phase/4-nest` **or** one PR per framework if each stays small.

**Typical paths:** `packages/express/`, `packages/fastify/`, `packages/nest/`, `examples/express-sms/`, `examples/fastify-email/`, `examples/nest-sms/`, `tests/integration/core-*.test.ts`.

### Commit pattern (per framework)

1. `feat(express): add route helpers and tests`
2. `docs: add express example README`
3. repeat pattern for `fastify`, `nest`

### Verification

```bash
pnpm --filter @otp-service/express test
pnpm --filter @otp-service/fastify test
pnpm --filter @otp-service/nest test
pnpm exec vitest run tests/integration/core-express.test.ts tests/integration/core-fastify.test.ts tests/integration/core-nest.test.ts
```

### Phase brain dump

```text
PHASE: 4 Framework integrations
GOAL: Thin HTTP glue; consumers compose OtpService from core/starter.
LOAD: packages/express|fastify|nest src + tests; docs/guides/frameworks/*.md
CONSTRAINTS: No OTP business logic duplication; match existing handler patterns.
VERIFY: package tests + integration tests per framework.
OUT OF SCOPE: Starter composition (Phase 5), publishability scripts.
```

---

## Phase 5 — Adoption, publishability, docs

**Plan:** Tasks 11–13 — `starter`, publishability scripts/tests, guides, CI/CD, release docs.

**Suggested branch:** `phase/5-adoption-release` (split `chore/ci` vs `docs` if diff is huge).

**Typical paths:** `packages/starter/`, `examples/starter-express-sms/`, `scripts/`, `tests/publishability/`, `tests/integration/starter-express.test.ts`, `.github/`, `docs/publishing.md`, `docs/release-readiness-checklist.md`, `docs/decisions/`.

### Commit pattern

1. `feat(starter): add composition helpers`
2. `test: add starter express integration and publishability checks`
3. `chore(ci): add workflows and dependabot`
4. `docs: add publishing and release checklist`

### Verification

```bash
pnpm --filter @otp-service/starter test
pnpm exec vitest run tests/integration/starter-express.test.ts
pnpm verify:publishability
```

### Phase brain dump

```text
PHASE: 5 Adoption + publishability
GOAL: Happy path via starter; tarball consumer checks; documented release.
LOAD: docs/publishing.md, docs/decisions/ADR-003-monorepo-publish-model.md, scripts/verify-package-runtime.mjs
CONSTRAINTS: Root private; packages public; MIT + repository metadata; NPM_TOKEN for automated publish.
VERIFY: starter tests, starter integration, verify:publishability, CI green.
OUT OF SCOPE: Changing core OTP semantics unless required for publish fix.
```

---

## Context hierarchy reminder

1. **Always:** [AGENTS.md](../../AGENTS.md) (or this file’s phase section)
2. **Feature-specific:** spec slice + plan task section only
3. **Implementation:** the package(s) you edit + their tests
4. **Iteration:** failing CI log excerpt, not the whole workflow output

## Confusion checkpoint

If a change spans two phases (e.g. core API + Express helper), **split into two PRs** merged in dependency order, or open **one PR with two clearly labeled commits** and explain in the PR body why merge cannot be split—default is **split**.
