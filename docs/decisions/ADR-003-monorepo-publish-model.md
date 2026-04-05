# ADR-003: Workspace privacy and public packages

## Status

Accepted

## Date

2026-04-05

## Context

The repository is a pnpm workspace. Some tooling treats the root `package.json` as the workspace project. npm consumers install individual packages (`@otp-service/core`, etc.), not the root.

## Decision

- Keep **`private: true`** on the **root** workspace package.
- Publish **`packages/*`** individually with **`publishConfig.access: public`** for the `@otp-service` scope.
- Version and changelog workflow uses **Changesets** (already configured); **independent** versioning per package unless we later add linked packages in Changesets config.

## Alternatives considered

- **Publish a meta “umbrella” package from root** — Rejected; root stays private and non-publishable.
- **Fixed/synchronized versions for all packages** — Possible later; independent versioning is the default for this layout.

## Consequences

- CI and `verify:publishability` validate tarball shape per package, not the root.
- Release automation on GitHub uses **`changesets/action`** (see `.github/workflows/release.yml`): **`ci:version`** then **`ci:publish`** (`pnpm build` + `changeset publish`), not `npm publish` on the root manifest.
