# Publishing to npm

Industry-standard flow for this repo: **Changesets** + **`changesets/action`** (see [`.github/workflows/release.yml`](../.github/workflows/release.yml)) + **branch protection** so `main` is always green from CI.

## 1. Canonical GitHub URL

Manifests must match the real GitHub remote.

```bash
pnpm sync-repo-url
```

This runs [`scripts/sync-repository-url.mjs`](../scripts/sync-repository-url.mjs) and rewrites `repository`, `bugs`, and `homepage` in the root and every `packages/*/package.json` from `git remote get-url origin` (SSH or HTTPS).

If you have no `origin` yet, add it first, then run the command.

## 2. npm scope and token

1. Create or join the **`@otp-service`** scope on npm (org or user scope).
2. Create an **automation** (granular) or **classic automation** token that can **publish** those packages ([npm token docs](https://docs.npmjs.com/creating-and-viewing-access-tokens)).
3. In the GitHub repo: **Settings → Secrets and variables → Actions** → add **`NPM_TOKEN`**.

Publishing from CI requires a token that can publish **without interactive 2FA on publish** (2FA on login is fine; use automation tokens as npm documents).

## 3. CI before release

[`.github/workflows/ci.yml`](../.github/workflows/ci.yml) must stay green on **`main`** (including `verify:publishability`). Prefer **branch protection**: require this check before merging.

## 4. Version line: **0.1.0** first

First public line uses semver **0.x** (`0.1.0`): signals “usable on npm” without promising a frozen 1.x API yet. A prepared changeset lives in [`.changeset/prepare-0-1-0.md`](../.changeset/prepare-0-1-0.md) (minor bump from `0.0.0` → `0.1.0` for all packages).

## 5. Automated release sequence

On every push to **`main`**:

1. **Release** workflow runs `changesets/action`.
2. If there are **pending changeset files**, it opens or updates a PR titled **“chore: version packages”** (versions + `CHANGELOG.md` per package, lockfile updated via `pnpm run ci:version`).
3. **Merge that PR** when ready.
4. On the next push to **`main`** (the merge commit), if there is nothing left to version but there are **unpublished versions**, the action runs **`pnpm run ci:publish`** (`pnpm build` then `changeset publish`).

If **`NPM_TOKEN`** is missing, the publish step fails — add the secret before merging the version PR.

## 6. Manual escape hatch

```bash
pnpm changeset          # add more changesets anytime
pnpm version-packages   # bump versions locally (then commit)
pnpm build && pnpm publish -r --access public
```

Prefer the automated path so versions and changelogs stay aligned.

## Root vs packages

The workspace root is **`private: true`** and is not published. Only **`packages/*`** are published; each has **`publishConfig.access: public`**.

## License

Packages are **MIT**. See the root [`LICENSE`](../LICENSE).
