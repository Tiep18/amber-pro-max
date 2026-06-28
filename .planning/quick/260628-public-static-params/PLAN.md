# Quick Task: Pre-render public long-tail pages

## Goal

Improve public storefront SEO and request-time performance by pre-rendering stable long-tail pages that already use cached public data.

## Scope

- Add `generateStaticParams` for localized blog posts.
- Add `generateStaticParams` for localized collection pages.
- Add sitemap `lastmod` for public URLs where existing cached data exposes a real publication date.
- Preserve dynamic catalog filtering.
- Verify lint, typecheck, production build, and route output.
