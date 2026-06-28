# Cart Hydration Count Fix

## Goal

Fix the storefront hydration mismatch where the server renders an empty mini cart but the browser immediately renders a persisted guest cart count from localStorage.

## Approach

- Confirm the cart count source is browser-only persisted guest cart state.
- Keep the context count at `0` until the cart provider has mounted and loaded browser storage.
- Verify lint, typecheck, and a browser scenario with preloaded cart storage.
