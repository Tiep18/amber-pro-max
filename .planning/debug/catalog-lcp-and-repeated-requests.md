---
status: resolved
created: 2026-07-06
---

# Catalog LCP And Repeated Requests

## Symptoms

- Development terminal shows repeated successful `GET /en/catalog` lines.
- Next.js reports that the first catalog product image is the Largest Contentful Paint and should use eager loading.

## Evidence

- A clean headless Chromium navigation followed by five idle seconds produced exactly one document request to `/en/catalog` and one request to `/api/storefront-context`.
- No client component on the catalog route calls `router.refresh`, reloads the page, or submits a form on mount.
- The context API request is expected from `StorefrontContextProvider` and is deduplicated while in flight.
- The first `ProductCardImage` uses the default lazy behavior even when it becomes the page LCP.

## Root Cause

- There is no catalog document-request loop in a clean browser session. Repeated terminal lines represent separate development navigations/reloads rather than an app-triggered loop.
- The LCP warning is caused by the catalog not identifying its first product image as above-the-fold content.

## Fix Plan

- Mark only the first catalog product image as eager/high-priority.
- Keep all later product images lazy to avoid unnecessary bandwidth.
- Add a Playwright regression test for the first-versus-later image loading behavior.

## Resolution

- `CatalogPage` marks only the first product card as the above-the-fold image candidate.
- `ProductCardImage` uses `loading="eager"` and high fetch priority for that card; subsequent images remain lazy.
- A clean Chromium verification produced one document request, one storefront-context request, zero LCP warnings, and confirmed eager loading on the first image.
- Focused Playwright, typecheck, lint, diff check, and production build passed; the build generated 104 static pages.
