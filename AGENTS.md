# OTP package monorepo — agent context

Persistent context for AI assistants (Level 1). For task-scoped detail, load **only** the section you need from [docs/guides/phase-pr-playbook.md](docs/guides/phase-pr-playbook.md) and the relevant spec slice from [docs/specs/otp-library-spec.md](docs/specs/otp-library-spec.md).

## Tech stack

- **Runtime:** Node.js **≥ 22** (see [docs/decisions/ADR-001-node-runtime-support.md](docs/decisions/ADR-001-node-runtime-support.md))
- **Workspace:** `pnpm` workspaces, **ESM** only (`"type": "module"`)
- **Build:** `tsup` (`tooling/tsup.base.ts`, `target: node22`)
- **Test:** `vitest` (root `vitest.config.ts`; package-local configs under `packages/*/vitest.config.ts`)
- **Lint / types:** ESLint flat config (`eslint.config.mjs`), `typescript-eslint` (type-checked), root `tsc --noEmit`
- **Release:** Changesets; GitHub Actions **CI** + **Release** (`.github/workflows/`)

## Commands (from repo root)

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm verify:publishability
```

Scoped: `pnpm --filter @otp-service/<package> test`

## Layout

- **`packages/*`** — publishable `@otp-service/*` packages (root `package.json` is **private**)
- **`examples/*`** — sample apps (workspace members)
- **`tests/integration/`** — cross-package tests
- **`scripts/`** — publishability + repo maintenance
- **`docs/`** — specs, plans, guides, ADRs, release checklist

## Conventions

- **OTP security:** no plaintext OTPs in persisted store; hashing via core signer (see [docs/guides/security.md](docs/guides/security.md))
- **Framework packages** wrap core — **no duplicated** OTP lifecycle business logic in Express/Fastify/Nest
- **Imports:** match existing style; extend existing patterns before inventing new ones
- **Hooks:** Husky + lint-staged run `eslint --fix` on staged `.ts` / `.mjs` (`git commit --no-verify` to skip once)

## Boundaries

- Do **not** commit `.env`, secrets, or tokens; use [`.env.example`](.env.example) for variable **names** only
- Do **not** commit `dist/`, `node_modules/`, `coverage/` (see [.gitignore](.gitignore))
- Prefer **small, reviewable** changes; for PR strategy and per-phase context templates, see [docs/guides/phase-pr-playbook.md](docs/guides/phase-pr-playbook.md)
- **Confusion:** if spec and code disagree, **stop** and surface the conflict — do not silently pick one

## Human workflow

- [CONTRIBUTING.md](CONTRIBUTING.md) — branching, Changesets, CI, Dependabot
- [docs/publishing.md](docs/publishing.md) — npm + `NPM_TOKEN` + sync-repo-url
