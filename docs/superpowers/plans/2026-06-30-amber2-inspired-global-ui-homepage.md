# Amber2-Inspired Global UI and Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish an amber2-inspired global design and motion system, then apply it to the shared storefront shell, overlays, product cards, and localized homepage without changing commerce behavior.

**Architecture:** Convert amber2's visual identity into semantic CSS tokens and focused reusable components instead of copying hardcoded styles. Keep Server Components as the default; add one small client-only reveal primitive for viewport entry, retain Radix state animations for overlays, and use the existing Next.js View Transition integration only for hierarchical navigation.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, next-intl, Radix UI, Lucide React, Playwright, Vitest.

---

## File Structure

- `src/app/layout.tsx`: load Nunito globally.
- `src/app/globals.css`: own semantic brand, layout, elevation, and motion tokens plus approved animation recipes.
- `src/components/ui/reveal.tsx`: client-only, once-per-viewport reveal boundary with reduced-motion-safe CSS classes.
- `src/components/ui/sheet.tsx`: consistent overlay, directional panel motion, safe-area, and overscroll behavior.
- `src/components/site-header.tsx`: branded logo, responsive container, mobile navigation composition, persistent transition isolation.
- `src/components/header-nav.tsx`, `src/components/header-account.tsx`, `src/components/header-market.tsx`: lighter navigation and icon/control styling.
- `src/components/site-footer.tsx`: branded multi-column footer, verified social destinations, existing policies/newsletter.
- `src/components/catalog/product-card.tsx`: editorial product hierarchy and restrained interaction motion.
- `src/components/cart/mini-cart.tsx`, `src/components/cart/cart-line.tsx`: polished cart sheet and compact cart line.
- `src/components/catalog/catalog-filter-content.tsx`: filter panel styling consistent with sheets.
- `src/app/[locale]/page.tsx`: restructured homepage using existing images and truthful data.
- `src/messages/en.json`, `src/messages/vi.json`: equivalent optimized homepage/footer copy.
- `public/images/logo.webp`, `public/images/footer-logos/*.png`: copied brand assets from amber2.
- `tests/e2e/homepage.spec.ts`: homepage, logo, social, motion, responsive, and copy acceptance.
- `tests/e2e/foundation-ux.spec.ts`: shared shell, overlays, reduced motion, and admin/global-theme smoke checks.
- `tests/e2e/catalog-discovery.spec.ts`, `tests/e2e/cart.spec.ts`, `tests/e2e/newsletter.spec.ts`: preserve filter, mini-cart/cart-line, and newsletter behavior.

### Task 1: Lock Brand Assets, Typography, and Global Tokens

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/globals.css`
- Create: `public/images/logo.webp`
- Create: `public/images/footer-logos/fb-logo.png`
- Create: `public/images/footer-logos/insta-logo.png`
- Create: `public/images/footer-logos/etsy-logo.png`
- Test: `tests/e2e/foundation-ux.spec.ts`

- [ ] **Step 1: Add a failing global-brand smoke test**

Add a test that checks the logo and resolved global font family rather than coupling to Tailwind class strings:

```ts
test('public shell uses the shared amber brand foundation', async ({page}) => {
  await page.goto('/en');
  await expect(page.getByRole('banner').getByRole('img', {name: /ambertinybear/i})).toBeVisible();
  await expect(page.locator('body')).toHaveCSS('font-family', /Nunito/);
  await expect(page.locator('html')).toHaveCSS('background-color', 'rgb(255, 248, 240)');
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx playwright test tests/e2e/foundation-ux.spec.ts --grep "shared amber brand foundation"`

Expected: FAIL because the current header has no image logo and the body uses Be Vietnam Pro.

- [ ] **Step 3: Copy the approved amber2 assets**

Run in PowerShell:

```powershell
New-Item -ItemType Directory -Force public/images/footer-logos | Out-Null
Copy-Item 'D:\IT\projects\amber\amber2\public\images\logo.webp' 'public\images\logo.webp'
Copy-Item 'D:\IT\projects\amber\amber2\public\images\footer-logos\fb-logo.png' 'public\images\footer-logos\fb-logo.png'
Copy-Item 'D:\IT\projects\amber\amber2\public\images\footer-logos\insta-logo.png' 'public\images\footer-logos\insta-logo.png'
Copy-Item 'D:\IT\projects\amber\amber2\public\images\footer-logos\etsy-logo.png' 'public\images\footer-logos\etsy-logo.png'
```

- [ ] **Step 4: Replace the global font loader**

In `src/app/layout.tsx`, replace `Be_Vietnam_Pro` with:

```tsx
import {Nunito} from 'next/font/google';

const nunito = Nunito({
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-nunito'
});
```

Apply `className={nunito.variable}` to `<html>` and set `body` to `font-family: var(--font-nunito), ui-sans-serif, system-ui, sans-serif` in global CSS.

- [ ] **Step 5: Replace the neutral palette with semantic amber tokens**

Define a complete token set in `:root`, keeping existing token names where consumers already depend on them:

```css
:root {
  --background: #fff8f0;
  --foreground: #62220c;
  --surface: #ffffff;
  --surface-muted: #f8f3ef;
  --surface-warm: #fadbb7;
  --surface-warm-strong: #f7c993;
  --accent: #7a3418;
  --accent-hover: #62220c;
  --accent-foreground: #ffffff;
  --muted-foreground: #73584d;
  --border: #e5d4c8;
  --focus: #8b4513;
  --container: 80rem;
  --gutter: clamp(1rem, 3vw, 2rem);
  --radius-control: 0.75rem;
  --radius-card: 1rem;
  --radius-surface: 1.25rem;
  --shadow-card: 0 12px 32px rgb(98 34 12 / 0.08);
  --duration-exit: 150ms;
  --duration-enter: 210ms;
  --duration-move: 400ms;
}
```

Keep success, warning, destructive, trust, and admin navigation tokens as separate accessible semantic colors. Add a `.site-container` utility with `width: min(100%, var(--container)); margin-inline: auto; padding-inline: var(--gutter);`.

- [ ] **Step 6: Complete the supplied View Transition recipes**

Copy the fade, vertical slide, forward/back navigation, morph, persistent element, backdrop-blur workaround, and reduced-motion recipes from `vercel-react-view-transitions/references/css-recipes.md`. Do not invent extra page transition keyframes and do not use `transition: all`.

- [ ] **Step 7: Run the focused test and static checks**

Run: `npx playwright test tests/e2e/foundation-ux.spec.ts --grep "shared amber brand foundation" && npm run typecheck`

Expected: PASS.

- [ ] **Step 8: Commit the foundation**

```bash
git add src/app/layout.tsx src/app/globals.css public/images tests/e2e/foundation-ux.spec.ts
git commit -m "feat: add amber brand design foundation"
```

### Task 2: Add a Purposeful Scroll-Reveal Primitive

**Files:**
- Create: `src/components/ui/reveal.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/e2e/homepage.spec.ts`

- [ ] **Step 1: Add failing reveal and reduced-motion tests**

```ts
test('homepage sections reveal without hiding reduced-motion content', async ({page}) => {
  await page.emulateMedia({reducedMotion: 'reduce'});
  await page.goto('/en');
  const reveal = page.locator('[data-reveal]').first();
  await expect(reveal).toBeVisible();
  await expect(reveal).toHaveCSS('opacity', '1');
  await expect(reveal).toHaveCSS('transform', 'none');
});
```

- [ ] **Step 2: Verify the test fails**

Run: `npx playwright test tests/e2e/homepage.spec.ts --grep "reduced-motion"`

Expected: FAIL because `[data-reveal]` does not exist.

- [ ] **Step 3: Implement the focused client boundary**

Create `Reveal` with a semantic element option, bounded delay, and a one-shot observer:

```tsx
'use client';

import {useEffect, useRef, type CSSProperties, type ReactNode} from 'react';
import {cn} from '@/lib/utils';

export function Reveal({children, className, delay = 0}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      node.dataset.visible = 'true';
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        node.dataset.visible = 'true';
        observer.disconnect();
      }
    }, {threshold: 0.12, rootMargin: '0px 0px -5%'});
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-reveal
      style={{'--reveal-delay': `${Math.min(Math.max(delay, 0), 400)}ms`} as CSSProperties}
      className={cn('reveal', className)}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Add explicit reveal CSS**

```css
.reveal {
  opacity: 0;
  transform: translateY(1rem);
  transition-property: opacity, transform;
  transition-duration: var(--duration-enter), var(--duration-move);
  transition-delay: var(--reveal-delay, 0ms);
  transition-timing-function: ease-out;
}
.reveal[data-visible='true'] { opacity: 1; transform: translateY(0); }
@media (prefers-reduced-motion: reduce) {
  .reveal { opacity: 1; transform: none; transition-duration: 0s; transition-delay: 0s; }
}
```

- [ ] **Step 5: Add one temporary reveal boundary to the homepage**

Wrap the shopping-path heading group, not the whole `<section>`, so semantic section structure stays server-rendered and visible without JavaScript.

- [ ] **Step 6: Verify and commit**

Run: `npx playwright test tests/e2e/homepage.spec.ts --grep "reduced-motion" && npm run typecheck`

Expected: PASS.

```bash
git add src/components/ui/reveal.tsx src/app/globals.css src/app/[locale]/page.tsx tests/e2e/homepage.spec.ts
git commit -m "feat: add accessible scroll reveal motion"
```

### Task 3: Polish Sheet Motion and Overlay Anatomy

**Files:**
- Modify: `src/components/ui/sheet.tsx`
- Test: `tests/e2e/foundation-ux.spec.ts`
- Test: `tests/e2e/catalog-discovery.spec.ts`

- [ ] **Step 1: Add failing directional sheet checks**

Add stable attributes to assert direction and modal behavior:

```ts
test('mobile menu and filters expose directional, dismissible sheets', async ({page}) => {
  await page.setViewportSize({width: 390, height: 844});
  await page.goto('/en');
  await page.getByRole('button', {name: 'Open menu'}).click();
  await expect(page.getByRole('dialog')).toHaveAttribute('data-side', 'left');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
});
```

- [ ] **Step 2: Verify failure**

Run: `npx playwright test tests/e2e/foundation-ux.spec.ts --grep "directional"`

Expected: FAIL because the sheet content does not expose `data-side`.

- [ ] **Step 3: Implement explicit state animations**

Keep the existing `Sheet` API and add `data-side={side}` to content. Replace generic animation classes with side-specific transform/opacity classes, explicit durations, `overscroll-contain`, and `padding-bottom: env(safe-area-inset-bottom)`. The overlay fades; left content translates from `-100%`; right content translates from `100%`. Preserve focus trapping, Escape dismissal, title semantics, and the existing close label.

- [ ] **Step 4: Add reduced-motion-safe state CSS**

Use Tailwind `motion-reduce:transition-none` or global selectors targeting sheet data attributes. Never remove the closed state before Radix completes the exit animation.

- [ ] **Step 5: Run menu and filter tests**

Run: `npx playwright test tests/e2e/foundation-ux.spec.ts tests/e2e/catalog-discovery.spec.ts --grep "directional|mobile shop"`

Expected: PASS with no horizontal overflow.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/sheet.tsx tests/e2e/foundation-ux.spec.ts tests/e2e/catalog-discovery.spec.ts
git commit -m "feat: refine responsive sheet interactions"
```

### Task 4: Redesign the Branded Header

**Files:**
- Modify: `src/components/site-header.tsx`
- Modify: `src/components/header-nav.tsx`
- Modify: `src/components/header-account.tsx`
- Modify: `src/components/header-market.tsx`
- Modify: `src/app/[locale]/layout.tsx`
- Test: `tests/e2e/foundation-ux.spec.ts`

- [ ] **Step 1: Add failing header acceptance checks**

Check the real semantics users depend on:

```ts
test('header presents the logo and usable icon controls', async ({page}) => {
  await page.goto('/en');
  const banner = page.getByRole('banner');
  await expect(banner.getByRole('link', {name: /ambertinybear home/i})).toBeVisible();
  await expect(banner.getByRole('img', {name: /ambertinybear/i})).toBeVisible();
  await expect(banner.getByRole('button', {name: /cart/i})).toHaveCSS('min-height', '44px');
});
```

- [ ] **Step 2: Verify failure**

Run: `npx playwright test tests/e2e/foundation-ux.spec.ts --grep "logo and usable"`

Expected: FAIL because the current logo is text-only.

- [ ] **Step 3: Implement the responsive logo header**

Use `next/image` with explicit dimensions and `priority` for the above-fold logo:

```tsx
<Link href={getLocalizedPath('/', locale)} aria-label={homeLabel} className="shrink-0">
  <Image src="/images/logo.webp" alt="Ambertinybear" width={180} height={60} priority className="h-10 w-auto sm:h-12" />
</Link>
```

Use `.site-container`, retain sticky positioning, isolate the header with `style={{viewTransitionName: 'persistent-nav'}}`, and keep the backdrop-blur workaround from the View Transition recipe.

- [ ] **Step 4: Make navigation and controls lighter**

Use consistent Lucide stroke widths, 44px control boxes, visible focus states, compact cart badge positioning, and a text/avatar account control that does not shift layout when auth resolves. Keep active navigation through `aria-current` and preserve market-switch behavior.

- [ ] **Step 5: Complete the mobile sheet composition**

Put logo, primary navigation, market selection, and account actions into the left sheet with clear separators and localized labels. Do not duplicate simultaneously mounted named View Transitions.

- [ ] **Step 6: Verify header and shell behavior**

Run: `npx playwright test tests/e2e/foundation-ux.spec.ts tests/e2e/storefront-state.spec.ts`

Expected: PASS for 320/768/1024/1280 widths and existing auth/cart state checks.

- [ ] **Step 7: Commit**

```bash
git add src/components/site-header.tsx src/components/header-nav.tsx src/components/header-account.tsx src/components/header-market.tsx src/app/[locale]/layout.tsx tests/e2e/foundation-ux.spec.ts
git commit -m "feat: redesign the storefront header"
```

### Task 5: Build the Amber Footer Without Losing Newsletter or Policies

**Files:**
- Modify: `src/components/site-footer.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/vi.json`
- Test: `tests/e2e/newsletter.spec.ts`
- Test: `tests/e2e/homepage.spec.ts`

- [ ] **Step 1: Add failing footer content and social-link tests**

```ts
test('footer exposes verified social destinations', async ({page}) => {
  await page.goto('/en');
  const footer = page.getByRole('contentinfo');
  await expect(footer.getByRole('link', {name: /facebook/i})).toHaveAttribute('href', 'https://facebook.com/ambertinybear');
  await expect(footer.getByRole('link', {name: /instagram/i})).toHaveAttribute('href', 'https://instagram.com/ambertinybear');
  await expect(footer.getByRole('link', {name: /etsy/i})).toHaveAttribute('href', 'https://etsy.com/shop/ambertinybear');
});
```

- [ ] **Step 2: Verify failure**

Run: `npx playwright test tests/e2e/homepage.spec.ts --grep "social destinations"`

Expected: FAIL because the current footer has no social links.

- [ ] **Step 3: Add localized footer content keys**

Add equivalent `brandDescription`, `shopTitle`, `supportTitle`, `followTitle`, and link labels under `footer` in both message files. Preserve all existing `newsletter.*` keys unchanged so form behavior and tests remain stable.

- [ ] **Step 4: Compose the footer**

Use a dark-brown full-bleed footer with `.site-container`, logo/description, shop/support columns, existing published policy links, newsletter, locale switcher, and social links. Social images use explicit width/height and descriptive alt text. External links use `target="_blank" rel="noopener noreferrer"` and visible hover/focus treatment.

- [ ] **Step 5: Verify truthful content and working subscription**

Run: `npx playwright test tests/e2e/homepage.spec.ts tests/e2e/newsletter.spec.ts --grep "social destinations|footer explicitly|Vietnamese footer"`

Expected: PASS; no invented follower/review counts appear.

- [ ] **Step 6: Commit**

```bash
git add src/components/site-footer.tsx src/messages/en.json src/messages/vi.json tests/e2e/homepage.spec.ts
git commit -m "feat: redesign the branded footer"
```

### Task 6: Refine Product Cards, Mini Cart, Cart Lines, and Filters

**Files:**
- Modify: `src/components/catalog/product-card.tsx`
- Modify: `src/components/cart/mini-cart.tsx`
- Modify: `src/components/cart/cart-line.tsx`
- Modify: `src/components/catalog/catalog-filter-content.tsx`
- Test: `tests/e2e/catalog-discovery.spec.ts`
- Test: `tests/e2e/cart.spec.ts`

- [ ] **Step 1: Add failing visual-semantic checks**

Extend existing tests without asserting class strings:

```ts
await expect(page.getByRole('article', {name: 'International bear'}).getByRole('link', {name: /view product/i})).toBeVisible();
await expect(page.getByRole('article', {name: 'International bear'})).toContainText('Finished item');
```

For the mini cart, open it and assert the dialog contains a heading, scrollable line region, total, and checkout action; for an unavailable line, preserve its warning and disabled checkout behavior.

- [ ] **Step 2: Run focused tests before changes**

Run: `npx playwright test tests/e2e/catalog-discovery.spec.ts tests/e2e/cart.spec.ts`

Expected: existing behavior passes; newly added anatomy assertions fail where stable regions are not yet exposed.

- [ ] **Step 3: Redesign the product card**

Keep `ProductCard` server-rendered. Use a larger image area, subtle border/shadow, type badge overlay or compact metadata row, line-clamped title/description, tabular price, visible stock state, and one clear detail link. Animate only image `transform`, card `transform`, border color, and shadow. Keep wishlist accessible and unobscured. Retain `transitionTypes={['nav-forward']}`; do not add a named shared image transition until the product-detail surface is redesigned.

- [ ] **Step 4: Redesign mini-cart anatomy**

Use the shared right sheet. Keep a non-scrolling header and footer, an `overflow-y-auto overscroll-contain` line region, localized empty state, quote warnings, totals, and checkout action. Do not alter cart provider actions or market-availability rules.

- [ ] **Step 5: Redesign cart lines**

Use stable thumbnail dimensions, `min-w-0`, line-clamped title/variant labels, compact quantity controls with accessible names, tabular price, and a secondary removal action. Preserve optimistic/update behavior and disabled states.

- [ ] **Step 6: Align filter content with sheet styling**

Improve grouping, selected state, spacing, and focus treatment while preserving URL-authored filters and existing `transitionTypes={['catalog-filter']}` behavior.

- [ ] **Step 7: Run behavior and overflow tests**

Run: `npx playwright test tests/e2e/catalog-discovery.spec.ts tests/e2e/cart.spec.ts tests/e2e/checkout-market-change.spec.ts`

Expected: PASS with no changed pricing, availability, or checkout behavior.

- [ ] **Step 8: Commit**

```bash
git add src/components/catalog/product-card.tsx src/components/cart/mini-cart.tsx src/components/cart/cart-line.tsx src/components/catalog/catalog-filter-content.tsx tests/e2e/catalog-discovery.spec.ts tests/e2e/cart.spec.ts
git commit -m "feat: polish storefront commerce surfaces"
```

### Task 7: Restructure and Rewrite the Localized Homepage

**Files:**
- Modify: `src/app/[locale]/page.tsx`
- Modify: `src/messages/en.json`
- Modify: `src/messages/vi.json`
- Test: `tests/e2e/homepage.spec.ts`
- Test: `tests/unit/content/seo.test.ts`

- [ ] **Step 1: Add failing content and structure acceptance tests**

Preserve existing test IDs and add locale-specific value-proposition checks:

```ts
test('English hero clearly presents both product paths', async ({page}) => {
  await page.goto('/en');
  await expect(page.getByRole('heading', {level: 1, name: /handmade.*crochet|crochet.*pattern/i})).toBeVisible();
  await expect(page.getByTestId('hero-handmade-cta')).toBeVisible();
  await expect(page.getByTestId('hero-patterns-cta')).toBeVisible();
});

test('homepage makes no unsupported social-proof claims', async ({page}) => {
  await page.goto('/en');
  await expect(page.getByText(/5K\+|300\+|4\.9/i)).toHaveCount(0);
});
```

- [ ] **Step 2: Verify the new hero check fails**

Run: `npx playwright test tests/e2e/homepage.spec.ts --grep "both product paths"`

Expected: FAIL because the current H1 is only `Ambertinybear`.

- [ ] **Step 3: Rewrite equivalent English and Vietnamese copy**

Update `home.hero`, `home.paths`, featured-row intros, benefits, story, and CTA strings. The copy must explicitly distinguish handmade finished goods from downloadable PDF patterns, avoid unverifiable claims, and keep equivalent intent across locales. Update localized metadata only if the revised hero terms expose a clearer accurate title/description.

- [ ] **Step 4: Recompose the hero around the existing image**

Keep `/images/home/hero-studio.png`, `priority`, useful localized alt text, and stable dimensions. Use a responsive overlay, a content width that avoids widows, the new H1/value proposition, and the existing CTA test IDs. Preserve the mobile 320px no-overflow guarantee.

- [ ] **Step 5: Establish page rhythm and reveal boundaries**

Use `.site-container`, alternating white/cream surfaces, consistent section spacing, and `Reveal` around section heading/content groups. Cap card delays at 0/75/150/225ms. Do not wrap every text node or hide content indefinitely when JavaScript is unavailable.

- [ ] **Step 6: Preserve dynamic and SEO behavior**

Keep `revalidate`, `dynamic`, parallel market-aware queries, empty-row omission, `JsonLd`, canonical/alternate metadata, existing catalog paths, and `transitionTypes` on hierarchical links.

- [ ] **Step 7: Run homepage and SEO tests**

Run: `npx playwright test tests/e2e/homepage.spec.ts && npm run test:unit -- tests/unit/content/seo.test.ts`

Expected: PASS in both locales, at 320px, with truthful copy.

- [ ] **Step 8: Commit**

```bash
git add src/app/[locale]/page.tsx src/messages/en.json src/messages/vi.json tests/e2e/homepage.spec.ts
git commit -m "feat: redesign the localized homepage"
```

### Task 8: Audit Guidelines, Admin Impact, and Full Verification

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/components/ui/reveal.tsx`
- Modify: `src/components/ui/sheet.tsx`
- Modify: `src/components/site-header.tsx`
- Modify: `src/components/site-footer.tsx`
- Modify: `src/components/catalog/product-card.tsx`
- Modify: `src/components/cart/mini-cart.tsx`
- Modify: `src/components/cart/cart-line.tsx`
- Modify: `tests/e2e/foundation-ux.spec.ts`
- Modify: `tests/e2e/admin-dashboard.spec.ts`

- [ ] **Step 1: Add an admin global-theme smoke test**

Extend the existing authenticated test `ADM-01 D-09 D-10 D-12 renders actionable admin areas` immediately after `signIn(page, admin, '/admin')`:

```ts
await expect(page.getByRole('main')).toBeVisible();
expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
await expect(page.locator('body')).toHaveCSS('font-family', /Nunito/);
```

- [ ] **Step 2: Run static Web Interface Guidelines scans**

Search the changed files for disallowed patterns:

```powershell
rg -n "transition-all|outline-none|\.\.\.|onClick=.*router\.(push|replace)|<img\b" src/app/globals.css src/components src/app/[locale]/page.tsx
```

Review every icon-only control for `aria-label`, every decorative icon for `aria-hidden`, images for dimensions/alt, headings for hierarchy, flex text children for `min-w-0`, and sheets for `overscroll-behavior: contain`. Fix each finding in its owning task file.

- [ ] **Step 3: Verify reduced motion and View Transition placement**

Confirm there is no layout-level `<ViewTransition>` wrapping `{children}`; persistent header/footer snapshots are isolated; all custom motion has a reduced-motion path; and `default="none"` prevents unrelated transitions.

- [ ] **Step 4: Run the complete quality gate**

Run:

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run build
npx playwright test tests/e2e/homepage.spec.ts tests/e2e/foundation-ux.spec.ts tests/e2e/catalog-discovery.spec.ts tests/e2e/cart.spec.ts tests/e2e/newsletter.spec.ts tests/e2e/storefront-state.spec.ts
```

Expected: every command exits 0. Start the repository's documented local Supabase services before Playwright so authenticated and seeded tests execute rather than being skipped.

- [ ] **Step 5: Perform browser QA at representative sizes**

Inspect `/vi`, `/en`, `/en/catalog`, mini cart, mobile menu, mobile filters, and one authenticated admin page at 320×720, 390×844, 768×900, 1280×900, and 1440×900. Verify focus order, Escape close, scroll containment, image crop, long Vietnamese labels, social destinations, and no horizontal overflow.

- [ ] **Step 6: Commit audit corrections**

```bash
git add src tests/e2e
git commit -m "fix: close UI accessibility and motion gaps"
```

## Completion Boundary

This plan is complete when the design foundation, shared storefront shell, overlays, product card, and homepage pass the quality gate. Full redesigns of catalog detail, product detail, checkout, account, content pages, and admin workflows remain separate future plans. Product shared-element morphing remains deferred until the source card and destination product page can be changed and verified together.
