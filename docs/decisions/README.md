# Architecture decision records (ADRs)

Use this folder for **significant, expensive-to-reverse** decisions: toolchain, public API shape, default providers, Node support policy, publishing strategy.

## Naming

`ADR-NNN-short-title.md` with sequential numbers (001, 002, …).

## Template

Each ADR should include:

- **Status**: Proposed | Accepted | Superseded by ADR-XXX | Deprecated  
- **Date**  
- **Context** — problem and constraints  
- **Decision** — what we chose  
- **Alternatives considered** — what we rejected and why  
- **Consequences** — follow-on work and trade-offs  

Do not delete superseded ADRs; add a new ADR that references the old one.

## Index

| ADR | Title | Status |
|-----|--------|--------|
| [ADR-001](ADR-001-node-runtime-support.md) | Node.js 22+ as minimum runtime | Accepted |
| [ADR-002](ADR-002-v1-delivery-providers.md) | First-party Twilio + Resend adapters (v1) | Accepted |
| [ADR-003](ADR-003-monorepo-publish-model.md) | Private root, public workspace packages | Accepted |

Update this table when you add ADRs.

See also: [Release readiness checklist](../release-readiness-checklist.md) (documentation and ADRs section).
