---
status: complete
created: 2026-07-02
---

# Homepage Text Color Hierarchy

## Goal

Reduce the homepage and product-card feeling of "everything is brown" while preserving the existing beige, brown, cream brand direction, storefront logic, and SEO behavior.

## Scope

- Separate brand brown from default body text.
- Use warm charcoal/taupe for general reading text.
- Keep brand brown on CTAs, product prices, and selected brand anchors.
- Preserve existing routes, metadata, content, product fetching, JSON-LD, and locale behavior.

## Verification

- `npm run typecheck`
- `npm run lint`
- `npx playwright test tests/e2e/homepage.spec.ts`
- `npm run build`
