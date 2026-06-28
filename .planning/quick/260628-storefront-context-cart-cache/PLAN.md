---
status: in_progress
---

# Stabilize storefront context and cart quote state

## Goal

Remove route-change auth refetches and avoid unnecessary cart quote refreshes while preserving immediate auth/market updates and authoritative checkout validation.

## Tasks

1. Add failing unit tests for context freshness and cart quote cache behavior.
2. Implement deduplicated, TTL-based context revalidation and a validated cart quote cache.
3. Verify unit, lint, typecheck, build, security, and focused browser navigation behavior.

## Must Haves

- Client navigation does not fetch storefront context merely because pathname changed.
- Focus revalidation is throttled and concurrent context requests are deduplicated.
- A fresh quote matching locale and cart lines is reused after remount.
- Cart mutations still obtain a new server quote, and checkout remains server-authoritative.
