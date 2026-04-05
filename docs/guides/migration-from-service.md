# Migrating From A Service-Based Mental Model

This package family is intentionally not an OTP microservice.

That changes where responsibility lives.

## What Moves Into The Consumer Service

With the library model, each service owns:

- its Redis client lifecycle
- its provider credentials and routing choices
- its HTTP routes
- its auth and abuse controls
- its deployment and runtime isolation

## What Gets Shared

The library still centralizes the parts that benefit from being shared:

- challenge lifecycle rules
- OTP hashing and verification behavior
- provider adapter contracts
- framework-native route/module helpers
- consistent typed result semantics

## Why This Is Simpler

Compared with a separate OTP service:

- no network hop
- no extra deployment
- no cross-service failure path in the happy flow
- no separate service ownership boundary for a Node-only organization

## What This Does Not Mean

This does not mean every service should invent its own OTP rules.

The goal is:

- local execution
- shared correctness
- centralized package review
- decentralized runtime ownership

If you later outgrow the library shape, the current API is intentionally service-like enough that you could wrap it behind a hosted boundary with less churn than starting from random helper code.
