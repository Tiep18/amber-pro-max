# Auth Header Context Refresh

## Goal

Fix stale storefront header account state after login and logout without requiring a manual page reload.

## Approach

- Confirm the header account UI reads from `StorefrontContextProvider`.
- Refresh storefront context when App Router navigation changes the pathname.
- Add an internal context-change event so sign-out clears the header immediately.
- Verify lint, typecheck, and build.
