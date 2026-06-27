# Ambertinybear Homepage Design

## Goal

Turn the homepage into the primary ecommerce discovery surface for Ambertinybear. Visitors must immediately understand that the store sells both finished handmade crochet goods and downloadable PDF patterns, then reach the relevant catalog path quickly.

## Visual System

- Refined handmade studio: bright neutral backgrounds, natural daylight, tactile yarn texture, and restrained terracotta/green accents.
- Product and studio photography carry the visual identity. UI remains open, readable, and lightly framed.
- Avoid fabricated proof, decorative badges, nested cards, autoplay, and excessive warm beige.

## Page Structure

1. Hero: `Ambertinybear` as the H1, a direct bilingual value proposition, two catalog CTAs, and a wide studio image.
2. Shopping paths: two image-led destinations for finished handmade goods and PDF patterns, with explicit fulfillment differences.
3. Featured products: separate market-aware rows for physical products and PDF patterns, each capped at four items and hidden when empty.
4. Trust band: three concise benefits covering careful handcraft, bilingual guidance, and secure market-appropriate purchasing.
5. Studio story: temporary maker-at-work image, honest non-biographical copy, and a shop CTA.
6. Newsletter/footer: retain the working subscription flow and update brand-facing language without promising an unavailable free download.

## Image Inventory

- `hero-studio.webp`: wide editorial studio scene with crochet bear, yarn, and tools; clear left-side negative space for hero copy.
- `handmade-category.webp`: finished amigurumi products in a clean natural-light setting.
- `pattern-category.webp`: printed crochet pattern pages, hook, yarn, and work in progress; no readable generated text.
- `maker-story.webp`: anonymous maker's hands crocheting at a bright worktable; no identifiable face required.

## Responsive Behavior

- Desktop hero uses a text/media composition with a visible hint of the shopping-path section below.
- Mobile stacks text before imagery, keeps both CTAs easy to reach, and uses stable image aspect ratios.
- Product rows use a responsive grid rather than mandatory horizontal scrolling.
- No viewport may overflow horizontally at 320px or above.

## Data and Failure States

- Resolve the active market server-side and load physical and PDF products in parallel.
- A failed or empty product query must not make the hero or other homepage content unavailable; omit unavailable product rows.
- Product titles, prices, inventory, links, and images come from the catalog projection rather than homepage fixtures.

## Accessibility and Performance

- Preserve one clear H1, semantic sections, useful localized headings, keyboard-visible focus, and meaningful image alt text.
- Use Next.js image optimization for local generated assets and stable dimensions to prevent layout shift.
- Keep the homepage server-rendered and avoid adding client-side state unless required by existing product controls.

## Acceptance

- Brand, two product types, and primary shopping actions are clear in the first viewport.
- Both locales provide equivalent ecommerce content.
- Physical and digital product rows remain distinct and market-aware.
- Generated assets render cleanly on desktop and mobile.
- Build, typecheck, focused tests, and browser QA pass.
