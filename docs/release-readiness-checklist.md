# Release readiness checklist — OTP package family

This checklist applies **context engineering** (what to load and verify, in what order), **shipping and launch** (quality, security, rollback mindset), and **documentation and ADRs** (decisions and consumer-facing docs) to a **TypeScript monorepo of npm packages**, not a single deployed web app. Skip or adapt items that do not apply (for example Core Web Vitals).

---

## 1. Context to load first (agents and humans)

Use this order so nothing important is missed:

| Layer | What to load | For this repo |
|-------|----------------|---------------|
| **Rules** | Cursor rules / `AGENTS.md` / team conventions | Project-wide agent and contributor expectations |
| **Specs and plans** | [otp-library-spec.md](specs/otp-library-spec.md), [otp-library-implementation-plan.md](plans/otp-library-implementation-plan.md) | Contract with intended behavior and scope |
| **Source** | Packages under `packages/*`, integration tests under `tests/integration/*` | APIs you are shipping |
| **Verification output** | Latest `pnpm test`, `pnpm verify:publishability`, CI logs | Evidence, not assumptions |
| **History** | Changesets, PR description, diff | What changed and why |

**Session brain-dump template** (paste at the start of a release-focused session):

```text
RELEASE CONTEXT:
- Packages: @otp-service/core, redis-store, testkit, provider-sms-twilio, provider-email-resend, express, fastify, nest, starter
- Target: [internal npm / public npm / git tags only]
- Node engines: root package.json engines field
- Local must-run: pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build
- On default branch: GitHub Actions also runs `pnpm verify:publishability` after the quality job (see `.github/workflows/ci.yml`)
- Docs entrypoints: README.md, docs/guides/*, [docs/publishing.md](publishing.md)
- Known gaps: [e.g. `NPM_TOKEN` not set in GitHub yet, branch protection not enabled]
```

---

## 2. Code quality and build

- [ ] `pnpm install` succeeds on a clean clone (document any private registry requirements).
- [ ] `pnpm audit --audit-level=high` passes (also enforced in CI).
- [ ] `pnpm lint` passes.
- [ ] `pnpm typecheck` passes.
- [ ] `pnpm build` succeeds for all packages that define `build`.
- [ ] `pnpm test` passes (unit and integration as configured in Vitest).
- [ ] Optional: `pnpm test:coverage` passes; CI uploads a **`coverage-report`** artifact (`lcov.info` + summary) from the `test` job.
- [ ] `pnpm verify:publishability` passes (runtime and consumer type resolution).
- [ ] No stray debug logging or secrets in shipped source (search for API keys, tokens, `console.debug` in `packages/`).
- [ ] No blocking `TODO` / `FIXME` on the public API surface without an explicit follow-up issue.

Optional per-package spot-check:

```bash
pnpm --filter @otp-service/core test
# repeat for other packages as needed
```

---

## 3. Security (library-appropriate)

- [ ] `pnpm audit` (or org equivalent) reviewed; **critical** and **high** issues triaged or fixed.
- [ ] OTPs and signing secrets: behavior matches [security.md](guides/security.md) (no plaintext OTPs in stores; safe logging guidance followed in code).
- [ ] Provider adapters: errors mapped consistently; no credential leakage in error messages.
- [ ] Examples use environment variables for secrets; `.env` and secrets are gitignored and documented.

---

## 4. Performance and compatibility

- [ ] **Node.js** support matches `engines` in root and package manifests; documented in README if restrictive (for example `>=22`).
- [ ] Server-side dependency weight is acceptable (no accidental huge dependencies in `dependencies` of published packages).
- [ ] Redis and provider SDK usage documented (connection lifecycle, timeouts) where relevant.

Skip web-only items (Core Web Vitals, image optimization) unless you ship a browser bundle.

---

## 5. Packaging and versioning

- [ ] Each publishable package has correct `name`, `version`, `files`, `exports`, and `types` / `main` / `module` as intended.
- [ ] `private: true` is removed only for packages you intend to publish.
- [ ] **Changesets**: a changeset exists for user-visible changes (`pnpm changeset`); `pnpm version-packages` is run when cutting the release (per team process).
- [ ] Tagging and branch strategy agreed (for example monorepo tag `v1.0.0` versus per-package tags).

---

## 6. Documentation and ADRs

- [ ] **License**: root `LICENSE` matches `license` in manifests (MIT).
- [ ] **README**: quick start, commands table, package roles, and Changesets workflow are accurate.
- [ ] **Guides** under [docs/guides/](guides/) match current APIs (`starter-quickstart`, `security`, `direct-package-setup`, framework guides, `migration-from-service`).
- [ ] **Implementation plan** ([otp-library-implementation-plan.md](plans/otp-library-implementation-plan.md)) is updated with completion status or superseded by a short shipped summary so it does not read like zero progress.
- [ ] **ADRs**: significant choices (toolchain, core API shape, provider defaults) are recorded under [docs/decisions/](decisions/) as `ADR-NNN-title.md` when not already captured elsewhere; see [decisions/README.md](decisions/README.md).
- [ ] **Changelog**: consumers can see what changed (Changesets-generated `CHANGELOG.md` or equivalent).

---

## 7. Examples and reproducibility

- [ ] Each example under `examples/*` installs and runs with documented environment variables (README per example).
- [ ] Example READMEs reference correct package names and import paths (no stale paths to other repositories).
- [ ] **CI** on PRs runs `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`; **push to `main`** also runs `pnpm verify:publishability` (see `.github/workflows/ci.yml`). Optionally add example smoke jobs later.

---

## 8. Shipping mindset (rollback and observation)

Define what a bad release means and how to undo it:

- [ ] **Rollback**: document how consumers pin an older version; npm yank or unpublish policy understood if applicable.
- [ ] **Communication**: release notes or GitHub release summarizes breaking changes and migration pointers.
- [ ] **Post-publish smoke** (first hour): install from registry or tarball into a throwaway app; run one generate or verify path per framework you care about.

---

## 9. Final sign-off

- [ ] Default-branch CI is green (quality + publishability on `main`).
- [ ] A second person or separate agent pass spot-checks public exports and one integration test file against the README quickstart.
- [ ] Open questions in [otp-library-implementation-plan.md](plans/otp-library-implementation-plan.md) (Open Questions section) are resolved or explicitly deferred with owners.

---

## Quick command block

Run from the repository root:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm verify:publishability
```

---

## Confusion to resolve before tagging

Do not ship until these are aligned:

- Spec versus implementation (behavior or API surface).
- `engines` versus stated LTS policy in docs.
- Private monorepo versus publish to npm: packaging and `private` fields must match the decision.

Record the resolution in an ADR or a short note under `docs/plans/` and link it from the README.
