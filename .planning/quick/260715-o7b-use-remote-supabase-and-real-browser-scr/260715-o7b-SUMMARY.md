---
quick_id: 260715-o7b
status: complete
source_status: complete
browser_status: passed
updated_at: '2026-07-15T18:12:00+07:00'
source_commits:
  - 098161e8
  - 83eb7c5f
  - 460a58c5
---

# Quick Task 260715-o7b Summary

Reworked every child section of the admin product editor from evidence gathered through real desktop and mobile browser captures against the permitted remote Supabase environment. The final layout is materially shorter, validation-stable, and preserves the existing catalog business behavior.

## Implemented changes

- Made `FieldError` truly conditional so valid fields no longer reserve empty vertical space while invalid fields keep their existing message, ID, `role="alert"`, wrapping, `aria-invalid`, and `aria-describedby` contract.
- Flattened the nested Content and SEO locale panels and tightened shared section padding/gaps.
- Kept Pricing market identity, readiness, toggle, and price controls aligned in a responsive compact grid.
- Changed taxonomy choices from one oversized row per option to 44px multi-column targets; Categories/Techniques share the desktop row, Tags use the full row, and mobile forms two columns where space permits.
- Changed SEO helper actions to a stable two-column mobile/three-column desktop grid.
- Recast Publish readiness into a compact two-by-two mobile-capable status grid without changing any readiness booleans or copy.
- Fixed the mobile navigator Scrollspy race found during browser testing: when the sheet closes, scrolling waits for two animation frames so the restored scrollbar and sticky-header height are measured before calculating the destination.

## Business-contract preservation

- Preserved all draft fields, mutations, validation paths/messages, save/publish handlers and payloads.
- Preserved all section IDs/order, form semantics, locale routing, taxonomy selection behavior, readiness logic, and fixed action behavior.
- Remote validation intentionally submitted invalid JSON only, so no product/draft was created. The only remote mutation was one exact ephemeral admin fixture, deleted and verified absent after testing.

## Browser evidence

Real production-preview captures are stored under `output/playwright/o7b-baseline/` and `output/playwright/o7b-after/`.

| Section | Baseline | Final | Reduction |
| --- | ---: | ---: | ---: |
| Content validation, desktop | 763 px | 671 px | 12% |
| Content, mobile | 775 px | 653 px | 16% |
| Pricing, desktop | 548 px | 476 px | 13% |
| Pricing, mobile | 788 px | 576 px | 27% |
| Taxonomy, desktop | 1382 px | 1002 px | 27% |
| Taxonomy, mobile | 1777 px | 1407 px | 21% |
| SEO, desktop | 784 px | 666 px | 15% |
| SEO, mobile | 920 px | 726 px | 21% |
| Publish, desktop | 388 px | 284 px | 27% |
| Publish, mobile | 516 px | 410 px | 21% |

- Desktop Search/SEO Scrollspy: idle at target, delta 0 px.
- Mobile Market offers via the section sheet: idle at target, delta 0 px after sheet/layout settlement.
- Mobile viewport: `clientWidth=360`, `scrollWidth=360`; no horizontal overflow.
- All 38 inspected controls in Content, Pricing, Taxonomy, and SEO were at least 44px high.
- Invalid English specifications JSON produced exactly one invalid/described field; its inline error remained visible above the fixed action bar.
- Same-origin admin navigation/RSC requests completed successfully. Observed console noise was limited to the existing report-only CSP upgrade warning and CSS preload warning, unrelated to this component.

## Verification

- `npx.cmd eslint src/components/admin/catalog/product-form.tsx` — passed.
- `npx.cmd tsc --noEmit` — passed.
- `npx.cmd vitest run tests/unit/admin/product-form-scrollspy.test.ts` — passed, 10/10.
- `npm.cmd run build` — passed, 105 static pages generated.
- `git diff --check` — passed.

## Commits

- `098161e8` — `style(260715-o7b): compact product editor sections`
- `83eb7c5f` — `fix(260715-o7b): settle compact mobile product editor layout`
- `460a58c5` — `style(260715-o7b): tighten pricing section spacing`
