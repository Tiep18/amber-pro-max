---
quick_id: 260710-n9n
status: complete
completed: 2026-07-10
commit: a68b1443
---

# Summary

Completed admin product editor workflow redesign.

## Changes

- Replaced the horizontal tab model with multi-open smart section toggles so short sections no longer create awkward empty page states.
- Split SEO into its own section separate from product content.
- Kept slug and SEO autofill actions in the SEO section.
- Replaced taxonomy checkbox lists with searchable multi-select controls and selected chips.
- Kept collection display order only for selected collections.
- Converted market offers into a compact pricing matrix.

## Verification

- `npm run typecheck` passed.
- `npm run lint` passed.

## Notes

- No catalog server actions, schemas, publish checks, cache invalidation, storefront SEO, ISR, or static route code were changed.
