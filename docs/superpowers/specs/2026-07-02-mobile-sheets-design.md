# Mobile Sheets Design

## Goal

Redesign the mobile navigation sheet and mini-cart sheet so they feel warm, refined, and modern while preserving current storefront behavior, locale routing, cart state, and accessibility.

## Shared Sheet

- Keep the Radix Dialog primitive and focus-management behavior.
- Use a warm translucent overlay and a softly tinted paper surface rather than flat white.
- Animate the overlay with opacity and the panel with GPU-friendly `transform` and opacity.
- Opening lasts about 300ms with a soft ease-out; closing is slightly faster.
- Respect `prefers-reduced-motion` and avoid layout properties in animation.
- Use a slim close control with a clear focus-visible state.

## Mobile Navigation

- Keep the sheet on the left and limit its width so a small part of the page remains visible.
- Present the brand as a compact editorial header.
- Render navigation links as spacious rows with a lightweight arrow and a restrained active marker, without filled rounded blocks.
- Group market and account controls toward the lower portion of the sheet with subtle separators and surface shifts.
- Close the sheet when a primary navigation link is selected.

## Mini Cart

- Keep the sheet on the right and use the full mobile width up to the existing desktop maximum.
- Show the item count near the heading.
- Every line displays its `imageUrl` as a square thumbnail. Missing images use a quiet fulfillment-type fallback.
- Use a compact line layout: thumbnail, product information, price, quantity control, and remove action.
- Avoid nested bordered cards; use whitespace and separators between lines.
- Keep subtotal and purchase actions in a sticky footer. Checkout remains primary; the full-cart action becomes visually secondary.
- Preserve unavailable, quantity-adjusted, empty, loading, and blocked states.

## Accessibility And Verification

- Maintain semantic buttons, links, dialog title, close labels, keyboard focus trapping, and WCAG-oriented contrast.
- Ensure no horizontal overflow at 375px.
- Verify image fallback, long titles/variants, multiple lines, empty cart, open/close animation, and reduced motion.
