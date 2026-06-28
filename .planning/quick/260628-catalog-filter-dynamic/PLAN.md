# Catalog Filter Dynamic Fix

## Goal

Restore category/type filtering on the catalog page after the SEO/ISR pass.

## Approach

- Keep catalog query URLs server-rendered because filters depend on `searchParams`.
- Preserve canonical/noindex metadata for faceted query URLs to avoid SEO duplication.
- Verify category query returns filtered results and production build keeps other SEO ISR improvements.
