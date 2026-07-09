---
status: complete
date: 2026-07-09
---

# Storefront Performance Test Boundary

## Objective

Update the storefront performance unit test so it verifies the current product-card image boundary after image rendering was extracted into `ProductCardImage`.

## Plan

1. Point the Next image pipeline assertion at `product-card-image.tsx`.
2. Add a product-card boundary assertion to ensure product cards continue to route through `ProductCardImage` and do not render raw `<img>` tags.
3. Re-run the focused storefront performance test and full verification.
