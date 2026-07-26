---
status: diagnosed
trigger: 'Post-wave npm run build compiled/typechecked but failed collecting page data for /[locale]/technique/[techniqueSlug] with Error catalog_query_failed. Determine whether this is solely expected remote Supabase schema drift or a code/fallback regression introduced by recent Phase 9 changes. Do not apply remote migrations or alter external state.'
created: 2026-07-26T11:23:25.1213112+07:00
updated: 2026-07-26T13:44:03.2521518+07:00
---

## Current Focus

hypothesis: Confirmed — the remote build remains blocked by its unapplied catalog projection migration, and the adjacent 684/685 unit result was solely a stale pre-Plan-09-13 source assertion.
test: Complete. The exact unit failure was reproduced before the two-line test-only fix, then targeted, related, full-unit, security, formatting, and whitespace gates passed.
expecting: The repository unit gate remains 685/685; the production build remains blocked until the authorized remote migration is applied.
next_action: Commit the taxonomy contract correction with this evidence, then hand the exact build blocker and verified unit result to the Phase 09 orchestrator.

## Symptoms

expected: `npm run build` completes successfully; catalog pages may use the existing fallback when the configured remote Supabase lacks the local private catalog projection migration.
actual: Compilation and typechecking completed, but page-data collection failed for `/[locale]/technique/[techniqueSlug]`.
errors: `Error: catalog_query_failed`
reproduction: Run `npm run build` in the current post-wave Phase 9 worktree/environment.
started: Observed after Plan 09-13; Plan 09-06's local migration passed local database tests, while the configured remote Supabase is known not to have been migrated.

## Eliminated

- hypothesis: Plan 09-13 introduced a fallback/error-propagation regression in technique/tag ISR routes.
  evidence: `git diff 34b0dbe..HEAD` shows no change to `techniqueProjections`, `tagProjections`, `catalogProjection`, or `listCatalogFacetsFiltered`; later changes only register localized route slugs and widen image metadata typing.
  timestamp: 2026-07-26T13:31:28.0390948+07:00

- hypothesis: The current TypeScript caller uses an RPC name/signature different from the checked-in migration.
  evidence: `listCatalogFacetsFiltered` calls `list_catalog_facets_filtered` with eight text-compatible parameters, exactly matching the migration and pgTAP `has_function` contract.
  timestamp: 2026-07-26T13:31:28.0390948+07:00

- hypothesis: A legacy catalog-facet fallback can safely replace the missing RPC during static generation.
  evidence: Plan 09-10 explicitly reused the filtered projection because the legacy unfiltered RPC exposes only category/collection and cannot provide technique/tag identities or filter-aware counts. Falling back would silently generate incomplete/incorrect indexable routes.
  timestamp: 2026-07-26T13:31:28.0390948+07:00

## Evidence

- timestamp: 2026-07-26T11:23:46.9463961+07:00
  checked: `.planning/debug/knowledge-base.md`
  found: No knowledge-base file exists.
  implication: There is no known-pattern shortcut; investigate the observed build and code paths directly.

- timestamp: 2026-07-26T11:24:25.0750236+07:00
  checked: Phase 09 Plans/Summaries 09-06, 09-10, and 09-13
  found: Plan 09-06 added two new authoritative projection RPCs in local migration `20260723193000_private_catalog_projection_authority.sql`; Plan 09-10 introduced literal technique/tag ISR routes; Plan 09-13 later changed catalog query validation and UI consumers but did not deploy a remote migration.
  implication: Both environment/schema drift and an integration regression at the new static-route boundary remain plausible; the exact route/cache error propagation decides between them.

- timestamp: 2026-07-26T11:25:30.6291510+07:00
  checked: Complete technique/tag route, catalog query/cache code, Plan 09-10 summary, and commit diff from `34b0dbe` to `HEAD`
  found: Both static routes call `getCachedCatalogProjection`, which directly calls the new `list_catalog_facets_filtered` RPC and intentionally propagates monitored `catalog_query_failed`. Plan 09-10 explicitly records the remote production classifier failing on that missing RPC and passing against migrated local Supabase. Since the Plan 09-10 route commit, only `LocalizedRouteSlugs` rendering and nullable image TypeScript typing changed; the projection/fallback call chain is byte-for-byte unchanged.
  implication: A recent Plan 09-13 fallback regression is contradicted by history. Reproducing the current build should confirm the already-known deployment gate rather than justify masking the missing authoritative RPC.

- timestamp: 2026-07-26T13:28:58.0678727+07:00
  checked: Configured build target and `20260723193000_private_catalog_projection_authority.sql`
  found: `.env.local` points to non-loopback host `kpnazmkprosboeiuhgea.supabase.co`. The checked-in migration defines and grants the exact eight-text-argument `public.list_catalog_facets_filtered` function used by `listCatalogFacetsFiltered`; its pgTAP file verifies the function, filter-aware results, anon execute access, and continued base-table denial.
  implication: The failing boundary is an unapplied reviewed migration on the remote target, not a TypeScript/RPC signature mismatch.

- timestamp: 2026-07-26T13:28:58.0678727+07:00
  checked: Controlled repeat-build attempt
  found: The attempt compiled successfully in 31.8 seconds, then became invalid as a diagnostic because a timed-out earlier command left another Next build tree sharing `.next`; the second process stalled during TypeScript. Only the exact second process tree was stopped. No clean repeat outcome is claimed.
  implication: Do not treat the self-induced build contention as product evidence and do not rerun the remote build. Rely on the caller's exact failing build plus Plan 09-10's controlled remote-fail/local-pass A/B.

- timestamp: 2026-07-26T13:31:28.0390948+07:00
  checked: Targeted Vitest run for catalog projection, catalog queries, and taxonomy static routes
  found: Catalog projection/query suites passed 14/14. The taxonomy suite passed 12/13; its only failure is a stale source-string assertion from Plan 09-10 expecting `LocaleSwitcher` to call `getEquivalentLocalizedPath` directly, while Plan 09-13 intentionally delegates the same route-equivalence contract to `getLocaleSwitchHref`.
  implication: Current catalog query/projection behavior is green. The one unit failure is adjacent test maintenance, not runtime evidence for the build failure.

- timestamp: 2026-07-26T13:31:28.0390948+07:00
  checked: Local Supabase availability and shared workspace state
  found: Local API port 55431 is reachable, but the workspace has multiple pre-existing Next/dev process trees and shared `.next` output. Plan 09-10 already recorded the local-migrated production classifier passing, and the relevant call path has not changed since.
  implication: A second local build would add unsafe shared-output contention without improving the controlled A/B evidence. No further build was run.

- timestamp: 2026-07-26T13:31:28.0390948+07:00
  checked: Worktree preservation
  found: Only the pre-existing generated `next-env.d.ts` modification and this new debug artifact are visible. Temporary diagnostic logs were removed; no `.next` cleanup or source reversal was attempted because the workspace is shared.
  implication: User/other-agent changes and generated state were preserved.

- timestamp: 2026-07-26T13:35:39.1353374+07:00
  checked: Plan 09-13 plan/summary, LocaleSwitcher, CommerceContextSwitcher, routing helpers, taxonomy source-contract test, and localized route provider wiring
  found: Plan 09-13 requires header/footer locale links to preserve equivalent localized entities and only allowlisted route query state. LocaleSwitcher calls `getLocaleSwitchHref(pathname, target, searchParams, localizedSlugs)`; CommerceContextSwitcher calls the same helper with `targetLocale`; the helper delegates to `getEquivalentLocalizedPath` and `allowlistedRouteQuery`. Dynamic taxonomy pages still register both locale slugs and the locale layout still mounts `LocalizedRouteProvider`.
  implication: The production wiring is internally consistent and stronger than the stale LocaleSwitcher direct-call assertion. A focused source-contract update must assert the shared helper and all four inputs without weakening either global switcher or dynamic-slug coverage.

- timestamp: 2026-07-26T13:36:42.3160293+07:00
  checked: Unmodified targeted run `npm run test:unit -- tests/unit/content/taxonomy-static-routes.test.ts`
  found: The suite reproduced deterministically at 12/13 passing. Its only failure is line 61 requiring `getEquivalentLocalizedPath(pathname, target, localizedSlugs)` in LocaleSwitcher; the received source instead contains `getLocaleSwitchHref(pathname, target, searchParams, localizedSlugs)`.
  implication: The reported stale source assertion is reproduced exactly, while the remaining static taxonomy and dynamic-slug registration contracts are already green.

- timestamp: 2026-07-26T13:37:32.4511195+07:00
  checked: Minimal test-only diff in `tests/unit/content/taxonomy-static-routes.test.ts`
  found: Only the two stale direct-helper regexes changed. LocaleSwitcher must now call `getLocaleSwitchHref(pathname, target, searchParams, localizedSlugs)` and CommerceContextSwitcher must call `getLocaleSwitchHref(pathname, targetLocale, searchParams, localizedSlugs)`; provider and dynamic-slug assertions are unchanged.
  implication: The fix preserves both global consumer contracts and strengthens them to require the Plan 09-13 safe-query input.

- timestamp: 2026-07-26T13:38:13.2699929+07:00
  checked: Targeted post-fix taxonomy run
  found: `tests/unit/content/taxonomy-static-routes.test.ts` passed 13/13 in one file.
  implication: The exact pre-fix 12/13 failure is removed by the two-regex contract update without changing production behavior.

- timestamp: 2026-07-26T13:38:43.3498907+07:00
  checked: Related routing/taxonomy unit group
  found: `tests/unit/i18n/routing.test.ts`, `tests/unit/content/taxonomy-static-routes.test.ts`, and `tests/unit/content/blog-taxonomy.test.ts` passed 29/29 across three files.
  implication: Behavior-level equivalent localized routes and query allowlisting remain green alongside both static and blog taxonomy contracts.

- timestamp: 2026-07-26T13:39:40.7214725+07:00
  checked: Complete post-fix unit suite
  found: `npm run test:unit` passed 685/685 tests across 82 files.
  implication: The only stale contract in the prior 684/685 baseline is corrected with no unit regression.

- timestamp: 2026-07-26T13:40:16.9459258+07:00
  checked: Project security boundary suite
  found: `npm run test:security` passed 47/47 with zero failures, including static storefront, projection, SEO, auth redirect, secret, payment, fulfillment, retention, content, and operations boundaries.
  implication: Updating the locale-switch caller contract did not weaken URL/query or adjacent security boundaries.

- timestamp: 2026-07-26T13:40:45.5464337+07:00
  checked: Generated-path cleanup boundary
  found: `next-env.d.ts` differs from HEAD only by Next's generated route-types import (`.next/types` versus tracked `.next/dev/types`); `test-results` is absent. `.next` predates this task (last write 13:27 versus investigation start 13:35) and no related Next/Playwright/Vitest process is active.
  implication: Restore the one generated tracked-line drift, but preserve the pre-existing ignored `.next` tree because this task neither created nor owns it.

- timestamp: 2026-07-26T13:41:06.2895777+07:00
  checked: Post-cleanup tracked worktree
  found: `next-env.d.ts` now hashes exactly to its index version and disappeared from `git status` after index refresh. Only `tests/unit/content/taxonomy-static-routes.test.ts` and this debug artifact remain.
  implication: Generated tracked noise is clean and no unrelated real change will enter the atomic commit.

- timestamp: 2026-07-26T13:42:00.0309518+07:00
  checked: Initial targeted formatting and whitespace checks
  found: `git diff --check` passed, but Prettier reported style drift in the edited test and debug markdown.
  implication: Run the repository formatter on only these two intended files before commit; no source or unrelated file needs formatting.

- timestamp: 2026-07-26T13:42:51.4985934+07:00
  checked: Formatter output and post-format diff
  found: Prettier check passed, but formatting the previously non-conforming tracked test also rewrote unrelated constant and `it.each` wrapping, expanding the semantic two-line fix to a 31-line diff.
  implication: Favor the debugger's minimal-fix rule: restore unrelated baseline formatting, retain only the two contract assertions, and rely on `git diff --check` plus tests for the tracked file.

- timestamp: 2026-07-26T13:43:21.0894370+07:00
  checked: Restored minimal tracked diff
  found: The taxonomy test diff is back to exactly two substitutions (2 insertions, 2 deletions), with no production or unrelated formatting change.
  implication: Final verification now measures the intended contract fix only.

- timestamp: 2026-07-26T13:44:03.2521518+07:00
  checked: Final minimal-diff targeted verification
  found: `tests/unit/content/taxonomy-static-routes.test.ts` passed 13/13 after unrelated formatter churn was removed, and `git diff --check` passed.
  implication: The two assertion substitutions alone fix the original source-contract failure and are ready for an atomic commit with this debug evidence.

## Resolution

root_cause: The configured `.env.local` production-build target is a remote Supabase project that has not received `20260723193000_private_catalog_projection_authority.sql`. Technique/tag `generateStaticParams` intentionally requires `list_catalog_facets_filtered` for market-complete technique/tag identities; the missing RPC is masked by monitored query handling as `catalog_query_failed`, which aborts page-data collection. This exact remote-fail/local-migrated-pass condition was already documented by Plan 09-10, and no later commit changed the call or fallback path. The adjacent unit gate failed independently because `taxonomy-static-routes.test.ts` still asserted the pre-Plan-09-13 direct `getEquivalentLocalizedPath` implementation instead of the intentional `getLocaleSwitchHref` delegation.
fix: No repository fallback or production-code change is appropriate for the build blocker. Apply the already-reviewed Plan 09-06 migration to the target Supabase project through the authorized migration/deployment workflow, then rerun the production build. For the adjacent stale unit contract, update only the two global-switcher source assertions to require `getLocaleSwitchHref` with pathname, target locale, search params, and localized slugs. Do not substitute legacy facets because they omit technique/tag authority and filter-aware counts.
verification: Plan 09-10's controlled A/B passed the production classifier against migrated local Supabase and failed against the unmigrated remote; current `.env.local` is confirmed remote; the migration/caller signatures agree; post-09-10 diffs leave the failing call chain unchanged; catalog projection/query tests pass 14/14. For the adjacent unit contract, the pre-fix targeted suite reproduced at 12/13; post-fix targeted passed 13/13, related routing/taxonomy passed 29/29, the full unit suite passed 685/685 across 82 files, security passed 47/47, and `git diff --check` passed.
files_changed: [tests/unit/content/taxonomy-static-routes.test.ts, .planning/debug/wave8-isr-catalog-build.md]
