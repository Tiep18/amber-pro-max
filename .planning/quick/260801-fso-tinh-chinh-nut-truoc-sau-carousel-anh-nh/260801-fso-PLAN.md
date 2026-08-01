---
quick_id: 260801-fso
status: in_progress
---

# Refine product carousel navigation controls

## Goal

Make the product-gallery previous/next controls feel lighter and cover less photography while preserving clear hover/focus feedback and accessible mobile touch targets.

## Tasks

1. Separate each control's 44px hit target from a smaller translucent 32px visual surface.
2. Reduce default opacity, border, blur, and shadow; increase clarity subtly on gallery hover and fully on direct hover/focus.
3. Hide unavailable edge controls and verify formatting, type safety, tests, build output, and responsive appearance.

## Done when

- Controls cover less of the product image and have no heavy default card treatment.
- Hover and keyboard focus remain obvious without abrupt or decorative motion.
- Mobile touch targets remain at least 44px and disabled controls remain semantic.

