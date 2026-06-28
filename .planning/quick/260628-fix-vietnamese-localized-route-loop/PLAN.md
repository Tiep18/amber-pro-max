---
status: completed
created: 2026-06-28
slug: fix-vietnamese-localized-route-loop
---

# Fix Vietnamese Localized Route Loop

## Scope

- Reproduce `/vi/cua-hang` redirecting back to itself.
- Patch proxy routing so Vietnamese localized storefront aliases rewrite to internal App Router paths.
- Verify `/vi/cua-hang` and representative localized routes return successfully.

## Verification

- `curl -L` for `/vi/cua-hang`.
- Check representative localized product/auth routes.
