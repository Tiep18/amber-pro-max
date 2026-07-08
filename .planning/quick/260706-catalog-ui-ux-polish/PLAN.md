---
status: complete
created: 2026-07-06
---

# Catalog UI/UX Polish

## Goal

Improve catalog UI/UX based on review findings while preserving SEO, ISR/static rendering, route structure, URL filter state, and ecommerce logic.

## Scope

- Fix mobile horizontal overflow in catalog controls.
- Add a stronger storefront header band without changing metadata or product queries.
- Add active filter summary chips and a clear-filters affordance.
- Polish category filter presentation for desktop and mobile.
- Add resilient product-card image fallback when a remote image URL exists but fails to load.
- Do not add dense product-card CTA buttons.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npx playwright test tests/e2e/catalog-discovery.spec.ts`
- `npm run build`
