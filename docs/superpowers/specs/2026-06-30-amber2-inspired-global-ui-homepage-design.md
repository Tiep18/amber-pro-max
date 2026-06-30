# Amber2-Inspired Global UI and Homepage Design

## Status and Scope

This design supersedes the visual direction in `2026-06-27-ambertinybear-homepage-design.md` while preserving its commerce, data, SEO, accessibility, and honesty requirements.

The first implementation increment establishes a global design foundation, updates shared storefront surfaces, and redesigns the localized homepage. It also makes global typography and semantic tokens safe for the admin area. Redesigning every remaining storefront and admin page is deferred to later increments.

## Goal

Give the current application the warm, recognizable character of the `amber2` project without copying its implementation weaknesses. Customers should experience a lighter header, clearer shopping paths, calmer product cards, polished animated overlays, and a cohesive brown-and-cream brand system across Vietnamese and English surfaces.

## Source of Truth

The reference implementation is `D:\IT\projects\amber\amber2`.

Reuse or adapt:

- the existing `public/images/logo.webp` brand logo;
- the Facebook, Instagram, and Etsy icon assets and destination URLs;
- the warm brown-and-cream visual character;
- the general header, footer, card, drawer, and reveal-animation feel.

Do not copy amber2's hardcoded colors, `transition-all` usage, unsupported claims, or component implementations verbatim. The current application's market-aware catalog, bilingual routing, cart, authentication, inventory, and secure checkout behavior remain authoritative.

## Design System

### Typography

- Use Nunito globally with Vietnamese and Latin support, loaded through `next/font` with `display: swap`.
- Apply it to storefront and admin surfaces.
- Use a compact, readable weight set and a consistent heading/body hierarchy.
- Balance headings and use comfortable line lengths for bilingual content.

### Color

Translate amber2's palette into semantic global tokens rather than scattering hex values:

- primary dark brown derived from `#62220C`;
- interactive brown derived from `#8B4513`;
- warm cream accents derived from `#FADBB7` and `#F7C993`;
- light surfaces derived from `#FFF8F0` and `#F8F3EF`;
- separate muted text, border, success, warning, and destructive tokens that meet contrast needs.

Storefront surfaces may use warmer and more expressive combinations. Admin surfaces use the same family in a restrained form: light working surfaces, clear borders, and semantic operational statuses that are not recolored merely for branding.

### Layout and Shape

- Standardize the primary content container around a 1280px maximum width with responsive gutters.
- Keep full-bleed hero and footer backgrounds while aligning their content to the shared container.
- Use softer radii and shadows than the current UI, but less exaggerated than amber2.
- Preserve usable layouts down to 320px and prevent horizontal overflow.

### Shared Primitives

Buttons, inputs, selects, dropdowns, cards, sheets, focus rings, badges, and surface elevations consume semantic tokens. Interactive controls retain at least a 44px hit area where appropriate, visible `focus-visible` treatment, and distinct hover/active states.

## Motion System

Motion communicates hierarchy, continuity, or appearance; it is not decorative noise.

### Scroll Reveal

Create one reusable reveal primitive inspired by amber2's `AnimatedWrapper`. It reveals section-level groups once as they enter the viewport and supports bounded delay/stagger values. It animates only `opacity` and `transform`, never `transition-all`, and disables motion under `prefers-reduced-motion`.

Homepage hero content may reveal on initial load. Below-fold sections reveal in small groups rather than animating every text fragment independently. Product grids use subtle, capped staggering so large lists do not create long animation queues.

### Overlays

Radix state drives sheet transitions:

- mobile navigation enters from the left;
- mini cart and filter panels enter from the right where spatially appropriate;
- the overlay fades while the panel translates;
- close animations remain interruptible;
- sheets contain overscroll and respect viewport safe areas.

### Navigation and Shared Elements

Retain Next.js experimental View Transitions and use explicit transition types only where the navigation is hierarchical. Homepage-to-catalog and product-list-to-detail navigation may use forward transitions. Persistent header and footer regions are isolated from page snapshots. Product-image shared-element morphs are introduced when the product-detail increment is implemented, not prematurely on an unmatched route.

Use the supplied React View Transition CSS recipes, including reduced-motion rules. Avoid a layout-level transition wrapper that would suppress page-level transitions.

## Shared Storefront Shell

### Header

- Place the amber2 logo in the current localized header with optimized dimensions and an accessible home link.
- Use a warm light surface, restrained border, and optional subtle translucency without transition flashes.
- Keep desktop navigation spacious and make active state legible without heavy pills.
- Use thin, visually consistent search, account/avatar, wishlist where present, and cart icons.
- Give icon-only controls accessible names and adequate hit areas.
- Keep cart count compact and stable when it changes.
- Present mobile navigation as an animated left sheet.

### Mini Cart and Filter

- Use consistent sheet anatomy: header, scrollable content, stable footer actions, safe-area padding, and a clear close control.
- Simplify cart lines around image, title, variant/type, quantity, price, and removal action.
- Preserve all existing market-availability, quote, and checkout rules.
- Make filters scannable and keep URL-backed filter state authoritative.

### Footer

- Use a dark brown full-width background with cream text and accessible link contrast.
- Include the logo, concise bilingual brand description, shopping links, support/policy links, and market-appropriate utility links.
- Reuse amber2's Facebook, Instagram, and Etsy assets and URLs.
- External links open safely and have clear accessible labels.
- Stack cleanly on mobile and avoid dense columns with sparse content.

## Homepage

### Hero

Keep the current hero image. Improve its responsive crop and overlay so bilingual copy remains readable without obscuring the product photography. Replace verbose copy with a short, localized value proposition that identifies both handmade amigurumi and downloadable crochet patterns. Preserve two unmistakable calls to action for those shopping paths.

### Shopping Paths

Retain separate image-led destinations for handmade goods and PDF patterns. Clarify the fulfillment difference with concise localized copy. Cards should feel editorial rather than like nested panels and use restrained image scale or arrow motion on hover.

### Featured Products

Keep distinct market-aware rows for physical products and PDF patterns. Product cards prioritize image, product type, localized title, market price, and purchase/availability state. Wishlist and cart actions remain secondary and do not obscure the product information. Empty rows remain omitted, as in the existing design.

### Trust and Brand Content

Retain concise trust benefits and studio/brand storytelling, using alternating white and cream sections to establish rhythm. Do not import amber2 follower counts, ratings, reviews, guarantees, or other claims unless the current application has verified data supporting them.

### Content Rules

- Optimize both Vietnamese and English copy for clarity and equivalent meaning.
- Avoid invented biography, social proof, urgency, availability, or fulfillment promises.
- Make headings specific and action labels descriptive.
- Preserve localized metadata, structured data, canonical URLs, and indexability.

## Admin Adaptation

The global font and semantic design tokens apply to admin pages. Admin tables, forms, navigation, and statuses remain task-dense and operationally legible. The first increment fixes visual regressions caused by the global foundation but does not redesign every admin workflow.

## Accessibility and Interface Quality

- Preserve the skip link, semantic landmarks, one clear H1, and hierarchical headings.
- Provide visible keyboard focus and accessible names for icon controls.
- Keep meaningful image alternative text and stable image dimensions.
- Use `Intl` for localized price and number presentation.
- Handle long localized labels, empty states, and narrow flex children without overflow.
- Avoid `transition-all`; animate only explicitly listed compositor-friendly properties.
- Honor reduced motion for scroll, overlay, hover, and view transitions.
- Keep sheet interaction keyboard accessible and contain sheet overscroll.

## Verification

Run lint, typecheck, relevant unit tests, and a production build. Browser QA covers Vietnamese and English at mobile and desktop sizes for:

- homepage hierarchy and responsive image treatment;
- header navigation, icon controls, logo, and cart count;
- footer content and social links;
- mobile menu, mini cart, and filter open/close motion;
- product-card readability and interaction states;
- reduced-motion behavior;
- representative admin pages after global token changes;
- horizontal overflow, focus order, and keyboard dismissal.

## Acceptance Criteria

- The interface is recognizably derived from amber2's warm brand while remaining suited to the current commerce architecture.
- Nunito, semantic colors, container widths, radii, and motion timings are globally reusable.
- Header, footer, product cards, mobile menu, mini cart, and filter feel visually coherent and lighter.
- Homepage content is clearer in both locales and retains the existing hero imagery and truthful commerce behavior.
- Motion is present but purposeful, interruptible, and reduced-motion safe.
- Storefront and admin remain readable, responsive, accessible, and functionally unchanged outside the approved visual scope.

## Deferred Work

- Full redesign of catalog, product detail, cart page, checkout, account, policy, blog, and all admin pages.
- Product-card-to-product-detail shared-image transitions until both route surfaces are redesigned together.
- New social proof, review statistics, guarantees, or marketing claims without verified data.
