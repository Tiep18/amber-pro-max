---
status: resolved
trigger: "Tags count shows 6 but the right browser column only displays 5 unless the hidden tag name is searched."
created: 2026-07-11
updated: 2026-07-11
---

# Taxonomy tags list clipped

## Symptoms

- Expected: all taxonomy terms are reachable by browsing or scrolling without knowing their names.
- Actual: the section count was correct, but terms beyond the visible panel were clipped.

## Resolution

- root_cause: The fixed-height desktop aside clipped overflow while `TaxonomyBrowser` lacked `h-full`, leaving its flex scroll child without a constrained height.
- fix: Added `h-full` to the browser flex root and made the terms viewport explicitly scrollable with stable scrollbar gutter.
- verification: TypeScript, focused ESLint, and all 407 unit tests passed.
- files_changed: `src/components/admin/taxonomy/taxonomy-manager.tsx`
- commit: `826a598`

## Evidence

- The count and list are both derived from `activeSection.terms`, eliminating a missing-data hypothesis.
- The desktop aside already had fixed height and clipping; establishing the inner height contract enables the intended list scroll behavior.
