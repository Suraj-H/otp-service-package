# ADR-001: Node.js 22+ as minimum runtime

## Status

Accepted

## Date

2026-04-05

## Context

Published libraries should declare a clear, LTS-aligned Node floor. Builds use `tsup` with `target: "node22"` and `engines.node` is `>=22.0.0` across packages.

## Decision

Support **Node.js 22 and newer** only for the initial public line. Dropping older majors later (if ever) will be treated as a **semver-major** change.

## Alternatives considered

- **Node 20 + 22** — Broader adoption, but Node 20 reaches end of maintenance around early 2026; extra CI matrix and possible `target` downgrade.
- **“Current” odd releases** — Rejected; we align with **Maintenance LTS**, not Current.

## Consequences

- Consumers on Node 20 must upgrade or stay on an older major if we later publish one.
- CI uses a single Node 22 job; no matrix until policy changes.
