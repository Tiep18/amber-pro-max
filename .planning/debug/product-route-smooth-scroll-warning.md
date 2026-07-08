---
status: resolved
created: 2026-07-06
---

# Product Route Smooth Scroll Warning

## Symptoms

- Navigating to a product route logs Next.js's `missing-data-scroll-behavior` warning.
- The first development request is slower than subsequent requests.

## Evidence

- `src/app/globals.css` sets `scroll-behavior: smooth` on `html`.
- `src/app/layout.tsx` does not declare `data-scroll-behavior="smooth"`.
- Next.js 16's bundled router checks that attribute before temporarily disabling smooth scrolling during non-hash route transitions.
- Two direct development requests to the same product route took 1273ms and 330ms respectively, consistent with cold development compilation rather than an application request loop.

## Root Cause

The application intentionally enables smooth in-page scrolling but does not opt into Next.js 16's route-transition override contract on the root HTML element.

## Fix Plan

- Add `data-scroll-behavior="smooth"` to the root `<html>` element.
- Add a browser regression test for the attribute and retain the global smooth-scroll behavior.

## Resolution

- Added `data-scroll-behavior="smooth"` to the root HTML element.
- The global smooth-scroll CSS remains active for in-page navigation.
- A real client-side navigation from catalog to product produced zero smooth-scroll warnings and retained the root attribute.
- Focused Playwright, typecheck, lint, diff check, and production build passed; 104 static pages were generated.
