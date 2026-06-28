# Summary

The header account state was stale because `StorefrontContextProvider` fetched `/api/storefront-context` only once when the persistent layout mounted. It now refreshes on pathname changes and listens for an internal context-change event. Sign-out forms dispatch that event with `user: null` so the avatar switches to the sign-in button immediately.
