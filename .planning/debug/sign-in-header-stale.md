---
status: resolved
slug: sign-in-header-stale
---

# Sign-in header remains stale after redirect

## Symptom

Successful sign-in redirects to the localized home page, but the persistent header still shows the sign-in button until a full reload.

## Root Cause

`signInAction` performs a server redirect immediately after setting Supabase auth cookies. The locale layout and `StorefrontContextProvider` persist across that client transition. Since pathname-based refetching was intentionally removed, the provider keeps its pre-login `user: null`, and the client form never receives a successful state from which to notify the provider.

## Fix Contract

Return the authenticated header user and safe redirect path from the action. On the client, publish the user to the persistent context before replacing the route.

## Verification

- Regression test observed failing before implementation and passes after the fix.
- Typecheck and lint pass.
- All 277 unit tests pass.
- Production build passes with public storefront ISR unchanged.
- All 34 security boundary tests pass.
