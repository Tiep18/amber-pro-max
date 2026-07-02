---
status: complete
created: 2026-07-02
completed: 2026-07-02
---

# Homepage content-led redesign

Goal: redesign the localized Ambertinybear homepage using content cues from the older crochet-ecommerce project while preserving storefront logic, SEO metadata, JSON-LD, market-aware catalog loading, localized routes, anchors, and existing test IDs.

Tasks:

- Update homepage E2E coverage first for the approved hero/trust copy and preserved CTA anchors.
- Refresh `src/messages/en.json` and `src/messages/vi.json` homepage content for CTA, benefits, trust, and story copy.
- Recompose `src/app/[locale]/page.tsx` into a more distinctive product-led homepage without changing product query flow, metadata generation, JSON-LD, catalog paths, or `ProductCard` usage.
- Run focused verification: homepage E2E, typecheck, lint, and build if feasible.
