---
status: awaiting_human_verify
trigger: "Resume and resolve the Plan 09-13 Task 3 E2E checkpoint on the current main working tree. Preserve all existing uncommitted Task 3 changes; do not reset/revert them and do not redo Tasks 1-2 commits (06e5ee1, 39f3acc, 2ea2d28)."
created: 2026-07-26T10:28:36.8524435+07:00
updated: 2026-07-26T11:16:25.9749392+07:00
---

## Current Focus

hypothesis: Confirmed — one authoritative StorefrontContext lifecycle now owns market mutation, recovery, and invalidation without accepting stale or self-published state.
test: Human verification of the original locale/market workflow in the real browser environment.
expecting: Independent controls, unavailable-market recovery, failure rollback/retry, reload, focus, and cross-tab convergence remain correct outside the automated harness.
next_action: Await human confirmation before archiving this debug session.

reasoning_checkpoint:
  hypothesis: "Fixture input and locator/readiness contract mismatches cause the E2E failures, while a separate strict client parser rejects the API's valid no-image product row and produces the catalog alert."
  confirming_evidence:
    - "vi+vn rendered the International $24 product, and the test passed `market` to a fixture that only reads `marketCookie`."
    - "The en+intl trace returned HTTP 200 with market=intl, USD products, and null image metadata; the client validator requires strings and then rendered the fail-closed alert."
    - "Convergence traces show aria-hidden=true on the open Radix trigger, and full accessible names such as `Language: English (EN). Shopping region: International — USD.` that cannot match `/EN.*INTL/`."
    - "The focus test observed three requests because visibility and focus were dispatched back-to-back while the first revalidation was still stale."
  falsification_test: "If explicit cookie seeding, null-image parser coverage, closed/fresh full-name locators, and settled visibility/focus sequencing still reproduce the same exact failures, this hypothesis is wrong."
  fix_rationale: "Each change repairs the boundary that generated the direct evidence while retaining the strong market, currency, committed-selection, invalidation, and fail-closed assertions."
  blind_spots: "Local Supabase data can change and Next dev image warnings remain noisy; the full rerun plus unit/type/lint/security gates must prove they do not mask another production defect."

## Symptoms

expected: Catalog and storefront convergence E2E suites pass cleanly with meaningful market, currency, invalidation, cross-tab, and focus-stability assertions.
actual: Catalog last observed 4/7; convergence promoted subset last observed 0/5. Failures were attributed to synchronization/selectors, including Radix aria-hidden behavior while pending, localized full aria-label names, and focus/context settlement timing.
errors: Catalog 4/7; convergence 0/5. Open trigger hidden by Radix while pending; short EN/VN selectors do not match full localized aria-labels; focus assertion can run before initial context settles; cross-tab flow fails before invalidation because of the short-label selector.
reproduction: Run tests/e2e/catalog-market.spec.ts and tests/e2e/storefront-market-convergence.spec.ts against the Playwright web server with the current Task 3 working tree.
started: During Plan 09-13 Task 3 E2E verification after Tasks 1-2 commits.

## Eliminated

## Evidence

- timestamp: 2026-07-26T10:28:36.8524435+07:00
  checked: Parent checkpoint state
  found: Production code, targeted unit tests, and typecheck were previously green; exact E2E failures were synchronization/selector-specific.
  implication: Prefer fixture/spec synchronization corrections unless a directly observed behavioral defect disproves the current hypothesis.
- timestamp: 2026-07-26T10:34:34.2801517+07:00
  checked: Repository instructions, GSD debug workflow and references, project skill indexes, active debug knowledge base, and working-tree inventory
  found: The requested debug workflow is active; no knowledge base exists; the worktree contains only the preserved Task 3 source/test changes plus this debug session. Project skills add no relevant implementation rules beyond preserving GSD ownership and dirty work.
  implication: Resume the existing session in place, preserve every uncommitted hunk, and derive fixes from the phase contracts and direct E2E evidence.
- timestamp: 2026-07-26T10:35:25.8100362+07:00
  checked: Plan 09-13, Phase 09 context and complete UI-SPEC, plus the full target E2E specs and fixture
  found: D-16/D-17/D-23 require committed-state semantics, full localized accessible labels, and authoritative focus/cross-tab convergence. Current promoted tests still mix compact-code role selectors with full accessible names and reuse a trigger locator across Radix open/pending transitions.
  implication: Tests need contract-aware synchronization and locator refreshes; production changes remain suspect only if direct reproduction shows incorrect authority or projection behavior.
- timestamp: 2026-07-26T10:39:49.0720505+07:00
  checked: Full catalog-market E2E run
  found: 4 passed and 3 failed. Both semantic control tests pass. The vi+vn failure rendered the International-only $24 product. The matrix calls createSession(combination) with a `market` field, but createSession only seeds `marketCookie`, so both VN cases actually run without the requested cookie and resolve the INTL fallback.
  implication: The VN projection failures are fixture-call contract errors, not production market leakage. Fix the session input explicitly; investigate en+intl separately before changing assertions.
- timestamp: 2026-07-26T10:42:52.1842453+07:00
  checked: Isolated en+intl rerun, Playwright network trace, catalog response validator, and ProductCardView
  found: The isolated case failed twice. The private API returned HTTP 200 with the correct INTL/USD projection, but one product had null primary image fields. `isCatalogProduct` requires those three fields to be strings, while ProductCardView explicitly handles null/missing images. The parser therefore converts a valid projection into the fail-closed catalog alert.
  implication: Normalize or accept legitimate nullable image metadata at the client boundary and add regression coverage; do not weaken the ready/currency assertion or accept the error state.
- timestamp: 2026-07-26T10:47:39.8501905+07:00
  checked: Full storefront-market-convergence E2E run
  found: 2 passed, 4 failed, 1 flaky, and 3 skipped. Rapid and failed-action cases queried an aria-hidden Radix trigger; reload and cross-tab used compact `INTL` selectors absent from the full localized accessible name; focus dispatched visibility and focus revalidation without waiting, producing three requests instead of two.
  implication: The checkpoint hypothesis is confirmed by direct DOM and request-count evidence. Use full localized names, inspect committed attributes/options while the menu is intentionally open, and wait for each authoritative transition before the next event.
- timestamp: 2026-07-26T10:50:00.3538365+07:00
  checked: New catalog parser regression unit and initial typecheck
  found: The regression suite passes 8/8. Typecheck failed only in generated `.next/dev/types` with malformed route declarations left by completed Playwright dev-server runs, before checking project code.
  implication: The null-image fix is covered. Remove only the validated workspace-local generated `.next` output and rerun typecheck; do not change source to accommodate corrupt generated declarations.
- timestamp: 2026-07-26T10:53:26.5018541+07:00
  checked: Clean typecheck and full catalog-market E2E rerun
  found: Typecheck passes. Catalog E2E passes 7/7, including all four locale/market currency combinations and desktop/mobile independent controls.
  implication: Explicit cookie seeding and nullable-image validation fix the catalog failures without accepting a projection error or weakening currency assertions.
- timestamp: 2026-07-26T10:57:46.7101636+07:00
  checked: First convergence rerun after selector/readiness fixes and the retry network traces
  found: 5 passed, 2 failed, and 3 skipped with no flaky result. After market success, the trace shows the intended context GET aborted and a second GET consuming the next fixture response; the provider's separate BroadcastChannel receives its own published signal. In the failure test, the 503 market action is automatically retried by Next and the retry returns success/Set-Cookie, so INTL commits and no alert remains.
  implication: Prevent same-provider broadcast re-entry before publishing, and simulate the server action's logical error result rather than a transport failure that the framework retries.
- timestamp: 2026-07-26T11:00:51.4179727+07:00
  checked: Isolated rapid-intent and failed-action convergence tests after same-provider dedupe and logical-error response rewriting
  found: Rapid intent passes. The failure UI reaches the expected retained VN state and inline error, but route.fetch has already applied the successful server action's INTL cookie before the rewritten response is fulfilled. A retry also exposed two page alerts, so an unscoped role query can select the cart refresh alert instead of the market menu alert.
  implication: Preserve the pre-action cookie around route.fetch and scope failure controls to the open market menu; no production behavior change is indicated by this remaining fixture-only failure.
- timestamp: 2026-07-26T11:02:18.2112683+07:00
  checked: Failed-action convergence test in isolation after cookie restoration and menu-scoped assertions
  found: The test passes 1/1 in 41.3 seconds; VN remains committed in both the UI and cookie while the market-specific alert and retry control remain visible.
  implication: The fixture now models a durable logical mutation failure without framework retry or cookie side effects; run the complete suite to check interactions and stability.
- timestamp: 2026-07-26T11:04:13.6276048+07:00
  checked: Complete convergence suite after all root-cause fixes
  found: Six passed, three intentionally skipped, and the reload/navigation test passed on retry but was reported flaky. On the first attempt the generic visible href click returned while the URL remained `/vi`; the error snapshot showed the correct unique header catalog link and the authoritative VI/INTL context already rendered.
  implication: Synchronize explicitly on the reloaded context and target the semantic header link while waiting for its URL transition; do not accept a flaky retry as a clean gate.
- timestamp: 2026-07-26T11:07:18.1276988+07:00
  checked: Complete convergence rerun with synchronized semantic navigation and the source message catalog
  found: Six passed and three skipped, but reload/navigation timed out twice because `vi.json` defines the header shop label as exact `Cua hang`, not the accented `Cửa hàng` used by the new locator.
  implication: Correct the exact accessible name; the navigation wait itself remains the right deterministic synchronization boundary.
- timestamp: 2026-07-26T11:09:06.0902877+07:00
  checked: Complete convergence suite after correcting the exact localized link name
  found: Seven promoted tests passed, three planned tests remained skipped, and there were zero failures and zero flaky retries.
  implication: The convergence checkpoint is clean in isolation; run both assigned E2E specs together before broader gates.
- timestamp: 2026-07-26T11:11:07.6102704+07:00
  checked: Catalog-market and storefront-market-convergence specs in one Playwright invocation
  found: Fourteen promoted tests passed, three planned fixme tests remained skipped, and there were zero failures or flaky retries.
  implication: The exact assigned E2E checkpoint is verified under a shared server lifecycle; proceed to adjacent unit, type, lint, and security regression gates.
- timestamp: 2026-07-26T11:16:25.9749392+07:00
  checked: Targeted unit, TypeScript, ESLint, Prettier, security-boundary, and final diff gates
  found: Five unit files pass 65/65; typecheck passes; lint passes without warnings; 47/47 security tests pass; every changed TypeScript file matches Prettier; git diff check is clean. Task 3 is committed as a17743b.
  implication: Automated verification is complete and stable; retain the session at awaiting_human_verify until the real workflow is confirmed.

## Resolution

root_cause: The promoted E2E specs crossed fixture and accessibility/synchronization boundaries, CatalogCommerce rejected legitimate nullable image metadata, and the provider did not suppress its own BroadcastChannel invalidation. The transport-failure fixture was automatically retried by Next, while its replacement route.fetch applied the successful cookie before the logical error was returned. Together these produced wrong fallback markets, fail-closed catalog alerts, hidden/full-name selector failures, duplicate revalidation, self-aborted market refresh, and a false cookie success in the failure scenario.
fix: Seed the requested market through `marketCookie`; model and validate nullable catalog image metadata; assert full localized accessible names only when Radix exposes the trigger; settle focus/visibility transitions; suppress same-provider broadcast re-entry; and return a logical market-action error from the fixture while restoring the pre-action cookie.
verification: Combined E2E passed 14 promoted tests with 3 intentional skips and no failure/flaky retry; targeted unit passed 65/65; typecheck, lint, Prettier, git diff check, and 47/47 security boundaries passed.
files_changed:
  - src/catalog/queries.ts
  - src/components/catalog/catalog-commerce.tsx
  - src/components/storefront-context.tsx
  - tests/e2e/catalog-market.spec.ts
  - tests/e2e/fixtures/storefront-market.ts
  - tests/e2e/storefront-market-convergence.spec.ts
  - tests/unit/catalog/storefront-projection.test.ts
