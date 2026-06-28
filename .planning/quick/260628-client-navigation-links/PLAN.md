# Client Navigation Links

## Goal

Reduce header/cart flicker during storefront page transitions.

## Approach

- Replace internal storefront anchors that trigger document reloads with `next/link`.
- Cover header navigation, catalog links, product cards, cart CTAs, and homepage CTAs.
- Verify lint, typecheck, production build, and browser navigation does not increment document navigation entries.
