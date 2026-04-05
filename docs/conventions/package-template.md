# Package Template Conventions

All runtime packages in this repository should inherit the same baseline conventions so that package creation stays mechanical and reviewable.

## Recommended Layout

```text
packages/<package-name>/
  package.json
  tsconfig.json
  tsup.config.ts
  src/
    index.ts
  test/
    <package-name>.test.ts
```

## `package.json` Template

Published packages must include `repository`, `bugs`, and `homepage` (copy shape from an existing `packages/*` manifest and point at the real GitHub URL).

```json
{
  "name": "@otp-service/<package-name>",
  "version": "0.0.0",
  "type": "module",
  "description": "<short package description>",
  "license": "MIT",
  "sideEffects": false,
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "files": [
    "dist"
  ],
  "engines": {
    "node": ">=22.0.0"
  },
  "publishConfig": {
    "access": "public"
  },
  "scripts": {
    "build": "tsup --config tsup.config.ts",
    "clean": "rm -rf dist",
    "lint": "eslint src test --ext .ts",
    "test": "vitest run",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  }
}
```

## `tsconfig.json` Template

```json
{
  "extends": "../../tsconfig.package.json",
  "include": ["src/**/*.ts"],
  "exclude": ["dist", "test"]
}
```

## `tsup.config.ts` Template

```ts
import { createPackageBuildConfig } from "../../tooling/tsup.base";

export default createPackageBuildConfig();
```

## Package Rules

- Keep `src/index.ts` as the only public entrypoint unless a spec-approved multi-entry package is needed.
- Prefer named exports over default exports.
- Do not expose framework-specific or provider-specific types from `core`.
- Package tests belong in `test/` and should exercise public APIs, not internal files.
- Every package must support `build`, `lint`, `test`, and `typecheck` scripts.
- Every package must declare a non-empty `description`, the shared Node engine policy, and `publishConfig.access`.
- Internal package dependencies may use the workspace protocol in source, but publishability checks must validate packed artifacts rather than relying on workspace-only resolution.
