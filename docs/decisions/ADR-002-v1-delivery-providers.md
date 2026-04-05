# ADR-002: First-party SMS and email adapters (v1)

## Status

Accepted

## Date

2026-04-05

## Context

The library ships concrete delivery adapters so adopters are not forced to integrate raw HTTP on day one. Multiple providers per channel would increase API surface and test burden.

## Decision

Ship **one** first-party SMS adapter (**Twilio**) and **one** first-party email adapter (**Resend**), both behind the shared `OtpDelivery` contract in `@otp-service/core`. Additional providers belong in separate packages (community or future first-party) that implement the same contract.

## Alternatives considered

- **Provider-agnostic only** — Fewer deps, but worse out-of-the-box story.
- **Multiple official adapters per channel** — More choice, higher maintenance; defer until demand is clear.

## Consequences

- Security and behavior reviews focus on Twilio and Resend paths.
- ADRs or README should name these as **v1 defaults**, not the only possible implementations.
