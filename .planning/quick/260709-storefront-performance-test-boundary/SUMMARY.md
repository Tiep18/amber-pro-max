---
status: complete
date: 2026-07-09
---

# Storefront Performance Test Boundary

Updated `tests/unit/content/storefront-performance.test.ts` to match the current catalog image component split. The test now checks the optimized image implementation in `ProductCardImage` and separately guards that product cards continue to use that boundary.

While re-running the full unit suite, SEO and JSON-LD tests also exposed an env isolation gap. Those tests now stub the full public client env set required by `getClientEnv()` so they do not depend on local `.env` files.
