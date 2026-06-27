---
status: resolved
created: 2026-06-27
slug: admin-store-pulse-overflow
---

# Admin Store Pulse Overflow

## Symptom

`/admin` overflows horizontally around the Store pulse card.

## Root Cause

The Store pulse card sits in a constrained dashboard grid column. The card and row links did not explicitly opt into shrinking with `min-w-0`, so the grid item could preserve intrinsic content width and push the page wider than the viewport.

## Fix

Allow the Store pulse grid/card/link/text content to shrink and keep the count badge as a non-shrinking element.
