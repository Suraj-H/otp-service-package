# Security Notes

This package family is designed to make the safe path the easy path, but consuming services still own secrets, runtime boundaries, and request-level auth decisions.

## Guarantees

The current implementation is designed so that:

- OTP values are not persisted in plaintext
- OTP comparison uses a constant-time path through the signer
- Redis stores challenge metadata plus the OTP hash, not the OTP itself
- framework packages do not add OTP logic outside the core lifecycle
- provider adapters validate provider responses instead of trusting them blindly

## Consumer Responsibilities

You still need to:

- inject the signer secret from your own secret-management path
- authenticate and authorize your OTP endpoints
- decide your route-level rate limiting and abuse controls
- avoid logging raw request bodies that may contain submitted OTPs
- choose safe observability patterns around provider failures

## Secrets

The signer secret should come from your existing secret-management mechanism:

- environment variables
- cloud secret manager
- Vault or equivalent internal tooling

Do not hardcode signer secrets in source, examples outside local development, or test fixtures that mimic production config.

## Logging

Do not log:

- generated OTP values
- raw verify request bodies
- provider request payloads without redaction

Provider adapters may legitimately contain the OTP in the outbound delivery request body. That is necessary for SMS/email delivery, but it should remain inside the provider boundary and not become part of application logs.

## Redis

Redis is the short-lived source of truth for challenge state in v1.

Recommended practice:

- use a dedicated key prefix per OTP purpose or service area
- keep TTL short unless your product requirement says otherwise
- avoid reusing OTP Redis namespaces across unrelated apps

## Safe Defaults

Current starter defaults:

- `otpLength: 6`
- `ttlSeconds: 600`
- `maxVerifyAttempts: 3`

Those defaults are intentionally conservative enough for common login and verification flows, but they are not a substitute for product-specific threat modeling.
