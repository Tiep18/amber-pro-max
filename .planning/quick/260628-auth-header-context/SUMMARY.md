# Summary

The header account state was stale because `StorefrontContextProvider` fetched `/api/storefront-context` only once when the provider mounted inside `SiteHeader`. Moving the provider to the locale layout keeps it alive across page navigation, avoiding header flicker. It still refreshes on navigation for auth changes, and sign-out forms dispatch an internal event with `user: null` so the avatar switches to the sign-in button immediately.
