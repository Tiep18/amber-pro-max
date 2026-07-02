---
status: complete
completed: 2026-07-01
---

# Summary

Upgraded the localized homepage UI/UX while preserving existing catalog queries, route paths, product card rendering, SEO JSON-LD, and test IDs.

Changed:

- Refreshed global palette, background treatment, typography weights, tabular numeric rendering, and smooth anchor scrolling.
- Reworked the homepage hero with a warmer image overlay, stronger type scale, glass-like content panel, richer CTA states, and benefit chips.
- Fixed the Vietnamese hero regression where the Ambertinybear wordmark overflowed the panel and the primary CTA text rendered too dark on the red background.
- Refined the approved soft editorial craft direction: blended the hero text into the image with layered washes instead of a detached card, preserved more mobile image visibility, softened header active/icon controls, widened homepage content to 1320px, and simplified product cards into full-card links without visible detail buttons.
- Applied the follow-up polish pass: shortened mobile hero by overlapping a compact translucent panel into the image and hiding benefit chips on mobile, added soft white/warm background bands between homepage sections, made the sign-in affordance a lighter underline link, and hardened product card rows/text wrapping for long content.
- Tightened the mobile hero again by raising the content panel closer to the header, reducing the mobile hero height, and making the panel/overlay much more translucent so the image reads through the text layer.
- Replaced the too-subtle single-tone homepage backdrop with full-width contiguous paper fields: clean white shop path, blush handmade products, sage pattern products/trust band, and honey/ivory story area, with no third-color gaps between sections.
- Removed the unclear decorative price rule in product cards and replaced the previous circular arrow treatment with a lighter, borderless click-through arrow cue.
- Rebuilt shop path cards as an asymmetric image-led grid with clearer hover affordances.
- Polished featured section headings, trust cards, and the maker story section with layered imagery and safer desktop overlap spacing.

Verification:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npx playwright test tests/e2e/homepage.spec.ts`
- Playwright screenshots checked at desktop, mobile, and full-page desktop sizes during implementation.
- Playwright screenshot rechecked `/vi` hero at 1438x759 after the overflow and CTA contrast fix.
- Playwright screenshots rechecked desktop, mobile, and Vietnamese hero after the soft editorial refinement.
- Mobile hero screenshot rechecked after the translucent overlap pass; hero height measured at 530px with no horizontal overflow.
- Product card long-title/long-description stress check verified no horizontal document overflow and no overflowing product title/description text blocks.
- Contiguous color field pass visually checked on desktop and mobile; build and homepage e2e passed after the product price rule removal and borderless arrow update.
