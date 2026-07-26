---
status: resolved
trigger: "Phase 09 Plan 09-15 confirmed that an unprefixed request with no NEXT_LOCALE and unsupported Accept-Language fr-FR,fr;q=0.9 redirects to /en instead of the required /vi fallback."
created: 2026-07-26T00:00:00+07:00
updated: 2026-07-26T16:28:00+07:00
---

## Current Focus

hypothesis: The Playwright locale fallback case is false-red because `extraHTTPHeaders` does not override the first Chromium navigation's `Accept-Language`; route-level request interception will send the exact unsupported header and expose the already-correct `/vi` proxy response.
test: Resolution complete.
expecting: Unsupported locale fallback is exercised with the exact navigation header and remains `/vi`.
next_action: Archived after verified test-only correction; Plan 09-15 can resume its independent stale fixture/selector cleanup.

reasoning_checkpoint:
  hypothesis: "The expected-failure marker masks a test-fixture bug: Chromium's first navigation sends `en-US` despite `extraHTTPHeaders`, so next-intl correctly redirects to `/en`; production already redirects an exact unsupported French request to `/vi`."
  confirming_evidence:
    - "Playwright trace captured the first `GET /` with `Accept-Language: en-US`, no NEXT_LOCALE, and `307 Location: /en`."
    - "Direct HTTP execution against unchanged production with `Accept-Language: fr-FR,fr;q=0.9` and no cookie returned `307 Location: /vi`."
    - "The installed matcher returns `vi` for the exact unsupported French preferences with default `vi`."
  falsification_test: "If route-level injection still reaches `/` with English or receives `/en`, the fixture-only hypothesis is wrong and production investigation must resume."
  fix_rationale: "Route interception changes the actual navigation request header at the network boundary, so the browser assertion exercises the stated unsupported-language contract rather than Chromium's default English locale."
  blind_spots: "The weighted browser case also uses context extra headers; its semantic coverage remains unit-backed but should be separately audited by Plan 09-15 rather than expanded inside this narrow unsupported-fallback fix."

tdd_checkpoint:
  test_file: "tests/e2e/localization.spec.ts"
  test_name: "missing supported locale preference falls back to Vietnamese"
  status: "green"
  failure_output: "RED evidence retained: browser expected /vi but received /en on both attempts before route-level header injection; focused GREEN run passed 1/1."

## Symptoms

expected: An unprefixed request without a locale cookie and with an unsupported language resolves to `/vi` per D-02/MKT-01.
actual: The request resolves to `/en`.
errors: No runtime exception; the redirect target violates the locale fallback contract.
reproduction: Clear NEXT_LOCALE, request `/` with `Accept-Language: fr-FR,fr;q=0.9`, and observe the redirect location.
started: Confirmed while promoting the Phase 09 expected-failure marker in Plan 09-15.

## Eliminated

- hypothesis: next-intl best-fit matching maps the exact unsupported `fr-FR,fr;q=0.9` input to English despite a Vietnamese default.
  evidence: Direct execution of the installed matcher returned `vi` for both its default best-fit algorithm and explicit lookup.
  timestamp: 2026-07-26T16:10:00+07:00

- hypothesis: `src/proxy.ts` must normalize unsupported `Accept-Language` through `preferredLocale()` before delegating to next-intl.
  evidence: The unchanged production proxy returned `307 Location: /vi` when directly sent the exact no-cookie French header; only the browser request that actually sent `en-US` redirected to `/en`.
  timestamp: 2026-07-26T16:24:00+07:00

## Evidence

- timestamp: 2026-07-26T00:00:00+07:00
  checked: Focused gap report from Plan 09-15
  found: `preferredLocale()` returns `vi` for unsupported input, but `src/proxy.ts` delegates directly to next-intl.
  implication: The likely defect is proxy integration; checkout, payment, market, and database authority are not implicated.

- timestamp: 2026-07-26T12:10:00+07:00
  checked: Complete `src/proxy.ts` and `src/i18n/routing.ts` implementations
  found: `routing.defaultLocale` and `preferredLocale()` both resolve fallback to `vi`, while proxy line 21 passes the original request directly to `intlMiddleware` and imports no project locale negotiation helper.
  implication: A wrong default configuration and a helper parsing defect are contradicted; the remaining single-point failure is the proxy's raw delegation to next-intl best-fit negotiation.

- timestamp: 2026-07-26T12:10:00+07:00
  checked: Existing unit and browser routing coverage
  found: Unit tests prove weighted supported-language selection and unsupported fallback independently, but the only proxy test asserts delegation and the browser locale case remains marked `test.fail`.
  implication: There is no executable proxy-level regression preventing the helper contract from being bypassed.

- timestamp: 2026-07-26T16:06:00+07:00
  checked: New proxy-level unsupported-language regression against unchanged production code
  found: The test failed deterministically with `Expected https://store.example/vi; received https://store.example/en`; Vitest reported 1 failed and 4 skipped.
  implication: The bug is reproducible at the proxy boundary, and the RED gate proves the existing implementation delegates raw unsupported input instead of the project fallback locale.

- timestamp: 2026-07-26T16:10:00+07:00
  checked: Installed next-intl 4.13.0 resolver and @formatjs/intl-localematcher
  found: next-intl delegates Accept-Language to the matcher with `vi` as default, and a direct call for requested `fr-FR, fr`, available `vi, en`, default `vi` returned `vi` for both best-fit and lookup algorithms.
  implication: The narrower claim that exact raw French input inherently selects English is false; the real browser request/runtime must be observed before production changes.

- timestamp: 2026-07-26T16:14:00+07:00
  checked: Promoted Playwright locale fallback test against a fresh configured web server
  found: Both initial execution and retry redirected `/` to `http://localhost:3210/en`; Playwright reported 1 failed test after removing only the expected-failure marker.
  implication: The production/browser regression is current and reproducible; stale server state and a stale expected-failure marker are ruled out.

- timestamp: 2026-07-26T16:20:00+07:00
  checked: Retry Playwright network trace for the first unprefixed navigation
  found: The initial `GET http://localhost:3210/` carried `Accept-Language: en-US`, no `NEXT_LOCALE` cookie, and received `307 Location: /en`; later asset requests carried the configured `fr-FR,fr;q=0.9`.
  implication: The redirect is consistent with the actual supported English input. The browser test did not send its nominal unsupported header on the navigation that exercises proxy locale negotiation.

- timestamp: 2026-07-26T16:24:00+07:00
  checked: Direct HTTP request against unchanged Next.js proxy
  found: A no-cookie `GET /` with exact `Accept-Language: fr-FR,fr;q=0.9` returned `HTTP/1.1 307 Temporary Redirect` and `Location: /vi`.
  implication: Production already satisfies the unsupported-language fallback contract. The root cause is isolated to Playwright header setup, so a proxy behavior change would be unnecessary and risk valid precedence semantics.

- timestamp: 2026-07-26T16:27:00+07:00
  checked: First GREEN browser-test attempt after the fixture correction
  found: Playwright stopped before test collection because port 3210 remained occupied by the manually launched diagnostic dev server.
  implication: No code verdict was produced; the exact leftover diagnostic process must be stopped before retrying.

- timestamp: 2026-07-26T16:31:00+07:00
  checked: Focused promoted browser fallback case after route-level header injection
  found: Playwright reported 1 passed test in 26.3 seconds; the request resolved to `/vi` without any production change.
  implication: The fixture-only root cause and fix are causally confirmed by a one-variable counterfactual.

- timestamp: 2026-07-26T16:17:00+07:00
  checked: Focused routing/proxy unit gate and complete localization browser spec
  found: Vitest reported 17/17 passing across 2 files; Playwright reported 8/8 passing across the localization spec.
  implication: Locale precedence, proxy response composition, route helpers, language switching, and locale/market independence remain green after the test-only correction.

- timestamp: 2026-07-26T16:22:00+07:00
  checked: TypeScript, ESLint, and security boundary gates
  found: Typecheck passed, lint passed, and all 48 security tests passed with zero failures, skips, or todos.
  implication: The test-only fixture correction introduces no static, lint, or security regression.

- timestamp: 2026-07-26T16:33:00+07:00
  checked: Database reset and complete six-file Phase 09 Task 1 browser matrix
  found: Database reset succeeded; Playwright ran 39 tests with 26 passed, 10 failed, and 3 skipped. All 8 localization tests passed, including the promoted fallback case. The failures matched the gap contract's cart, catalog-discovery, and storefront-state fixture/selector debt.
  implication: This locale fix is verified in the complete assigned matrix. Plan 09-15 Task 1 remains independently blocked on its already-documented tests-only cleanup and three convergence markers.

## Resolution

root_cause: Playwright's `extraHTTPHeaders` did not override Chromium's first document navigation `Accept-Language`; the proxy received supported `en-US` and correctly chose `/en`, while the test asserted the outcome for an unsupported French header that was only present on later requests.
fix: Removed the locale case's expected-failure marker and changed that case to inject `Accept-Language: fr-FR,fr;q=0.9` through Playwright route interception so the initial navigation carries the contract input.
verification: RED reproduced `/en` twice after marker promotion; exact-header curl against unchanged proxy returned `307 /vi`; focused GREEN passed 1/1; routing/proxy unit passed 17/17; localization E2E passed 8/8; typecheck and lint passed; security passed 48/48; full Phase 09 matrix kept localization 8/8 green and reported the pre-existing 26 passed, 10 failed, 3 skipped Task 1 debt; marker scan found only three pre-existing convergence fixmes; diff check passed; port 3210 was free.
files_changed: [tests/e2e/localization.spec.ts]
