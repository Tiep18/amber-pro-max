# GSD Debug Knowledge Base

Resolved debug sessions. Used by `gsd-debugger` to surface known-pattern hypotheses at the start of new investigations.

---

## unsupported-locale-fallback — Playwright navigation used English instead of the configured unsupported language
- **Date:** 2026-07-26
- **Error patterns:** unsupported locale, Accept-Language, fr-FR, redirect /en, fallback /vi, NEXT_LOCALE, Playwright extraHTTPHeaders
- **Root cause:** Playwright's `extraHTTPHeaders` did not override Chromium's first document navigation `Accept-Language`; the proxy received supported `en-US` and correctly chose `/en`, while the test asserted the result for an unsupported French header that appeared only on later requests.
- **Fix:** Removed the expected-failure marker and injected the exact unsupported `Accept-Language` through Playwright route interception so the initial navigation exercises the intended proxy contract.
- **Files changed:** tests/e2e/localization.spec.ts
---
