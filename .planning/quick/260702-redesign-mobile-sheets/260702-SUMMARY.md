---
status: complete
completed: 2026-07-02
---

# Summary

Redesigned the shared sheet primitive, mobile navigation sheet, and mini-cart sheet while preserving Radix focus management, locale routing, cart state, and checkout behavior.

Changed:

- Added smooth transform/opacity sheet animations with warm overlay treatment, asymmetric open/close timing, GPU-friendly compositing, and reduced-motion support.
- Reworked the mobile menu into an editorial layout with a compact brand block, light active marker, arrow navigation cues, and grouped market/account controls.
- Added compact mini-cart line items with 88px product thumbnails, fulfillment fallbacks, resilient long text handling, quantity controls, and a clear remove action.
- Fixed mini-cart thumbnails receiving raw Supabase object paths by resolving them to valid public product-media URLs before rendering with `next/image`; existing absolute and local image sources remain unchanged.
- Added mini-cart loading and empty states plus a sticky subtotal/checkout footer with a lighter full-cart action.
- Fixed icon-only button padding so close and remove icons retain their intended visual size inside 40px touch targets.
- Added a cart e2e assertion for the mini-cart thumbnail region and scoped an existing text assertion to the cart dialog.

Verification:

- `npm run typecheck` passed.
- `npm run lint` passed.
- `npm run build` passed.
- Product image URL regression tests passed 5/5, including the reported `seed/mini-bear-plush-uat.png` path shape.
- Homepage e2e passed 4/4.
- Cart e2e could not complete because the local Supabase catalog returned `catalog_query_failed`; this also affected pre-existing product/cart assertions unrelated to the sheet UI.
- Mobile menu checked at 390x844 with no horizontal overflow; open animation measured at 310ms and reduced motion at 1ms.
- Mini cart checked at 390x844 with a local quote-cache fixture: full-width sheet, 88px thumbnail, long title/variant handling, sticky footer, and no horizontal overflow.
- Browser reproduction with a cached raw storage path produced a valid Next image URL and no `Invalid URL` or relative-source runtime exception.
- Follow-up visual polish removed sheet corner rounding and overlay/footer blur, widened the mini cart to 560px when space permits, removed the header count badge, and rebuilt compact cart lines on a consistent thumbnail/content/price grid.
- Simplified quantity controls and introduced accent/muted text hierarchy across cart and mobile navigation instead of rendering every label in the same dark foreground color.
- Verified the compact cart at 375px with long product and variant text: document and line-item widths had no horizontal overflow; active/inactive menu colors resolved to accent and muted tokens respectively.
- Kept compact cart thumbnails square at 104px and compressed the right-side hierarchy to one type line, one truncated title, one variant/status line, and a bottom control row; measured thumbnail and control bottom edges matched exactly with a 0px delta at 375px.
