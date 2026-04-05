# Contributing

## Workflow

- **Trunk-based:** branch from **`main`**, keep branches short-lived (merge within a few days when possible).
- **Branch names:** `feature/short-topic`, `fix/short-topic`, `chore/short-topic`, `refactor/short-topic`, `phase/N-short-name` when following the implementation plan.
- **PRs:** one logical change per PR when you can; do not mix large refactors with feature work.
- **Phase-sized work:** see [docs/guides/phase-pr-playbook.md](docs/guides/phase-pr-playbook.md) for plan-aligned branches, **atomic commits per phase**, **agent context brain dumps**, and verification commands per phase.
- **First commit (no history yet):** [docs/guides/initial-import.md](docs/guides/initial-import.md) — explicit `git add` list and files to omit.

## Before you open a PR

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Optional: `pnpm test:coverage` (same as CI `test` job; HTML + `lcov.info` under `coverage/`).

`pnpm install` runs **`prepare`** → **Husky** installs Git hooks. Commits run **lint-staged** (`eslint --fix` on staged `.ts` / `.mjs`). To skip hooks once: `git commit --no-verify`. In environments without `.git` (some Docker builds), use `HUSKY=0 pnpm install`.

CI runs **parallel** jobs: `audit`, `lint`, `typecheck`, `test` (with **coverage** + **artifact** `coverage-report`: `lcov.info` + `coverage-summary.json`), `build`, and on **`main`** only `publishability`. To plug **Codecov** or similar, add a step that uploads `coverage/lcov.info` and a repository secret. **Dependabot** (weekly npm + GitHub Actions) lives in [`.github/dependabot.yml`](.github/dependabot.yml).

## Commits

Prefer [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `chore:`, …). Messages should explain **why**, not only what (the diff shows what).

## Releases and versioning

- User-facing package changes should include a **Changeset**: `pnpm changeset` (see [Changesets](https://github.com/changesets/changesets)).
- Full publish flow: [docs/publishing.md](docs/publishing.md).
- Pre-release checklist: [docs/release-readiness-checklist.md](docs/release-readiness-checklist.md).

## Security

- Never commit secrets, `.env` files, or tokens. Use [`.env.example`](.env.example) only for **names** of variables, not real values.
- If you introduce new secret-bearing config, document the variable in `.env.example` and in the relevant guide under `docs/guides/`.

## Docs and decisions

- Material behavior or policy changes: update `docs/guides/` or add an ADR under `docs/decisions/` when the choice is hard to reverse.
