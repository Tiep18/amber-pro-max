---
phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
plan: '14'
subsystem: storefront-seo-security
tags: [nextjs, seo, sitemap, json-ld, isr, cache-isolation, playwright, security]

requires:
  - phase: 09-independent-locale-and-market-commerce-projection-with-seo-s
    provides: Static storefront routes, private market projections, localized taxonomy paths, metadata helpers, and build classification from Plans 09-02, 09-07, 09-09, 09-10, 09-11, and 09-13
provides:
  - Localized category, collection, technique, tag, product, blog, and policy sitemap discovery
  - Cookie/IP invariance proof for public HTML, metadata, JSON-LD, sitemaps, and robots
  - Exact private/no-store projection response contracts across success and failure outcomes
  - Production route-classification and ASVS-style cache, fingerprint, broadcast, and logging gates
affects: [09-15, storefront-seo, catalog-security, release-verification, phase-09-verification]

tech-stack:
  added: []
  patterns:
    - Public taxonomy discovery uses a deterministic VN/INTL facet union while URLs remain locale-only
    - Browser invariance probes normalize only Next runtime nonce and script-order artifacts
    - Private projection handlers and cache arguments are enforced by runtime and source security gates

key-files:
  created: []
  modified:
    - src/app/sitemaps/[locale]/route.ts
    - tests/e2e/launch-seo.spec.ts
    - tests/e2e/catalog-detail-seo.spec.ts
    - tests/e2e/sitemap-robots.spec.ts
    - tests/unit/content/seo.test.ts
    - tests/unit/content/json-ld.test.ts
    - tests/unit/content/storefront-performance.test.ts
    - tests/security/catalog-boundaries.test.mjs

key-decisions:
  - 'Localized sitemaps union public VN and international facets so every eligible taxonomy route is discoverable without publishing a market URL dimension.'
  - 'Public-response equality preserves visible HTML and structured data verbatim while normalizing only framework-generated nonce and runtime script ordering.'
  - 'The release classifier must run from clean generated artifacts against the configured schema; cached local build output is not acceptable release evidence.'

patterns-established:
  - 'SEO invariance matrix: compare every localized public surface across VN/US geo and absent, valid, and invalid ACTIVE_MARKET cookies.'
  - 'Zero-tolerance boundary gate: required files cannot be skipped and fingerprint, request API, private cache, broadcast, and logging contracts fail closed.'
  - 'Cross-file E2E taxonomy fixtures share stable disposable IDs so five-minute sitemap caches remain deterministic.'

requirements-completed: [CAT-05, CAT-06, SEO-02, SEO-03, SEO-04, OPS-04]

duration: 1h 38m
completed: 2026-07-26
---

# Phase 09 Plan 14: SEO, Static Build, Cache Isolation, and Catalog Security Gate Summary

**Localized taxonomy sitemaps, 144-variant public-response invariance proof, private no-store enforcement, and a clean production classifier now protect every indexable storefront route from market cache leakage.**

## Performance

- **Duration:** 1h 38m
- **Started:** 2026-07-26T06:47:17Z
- **Completed:** 2026-07-26T08:25:23Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments

- Added deterministic localized technique and tag discovery beside category, collection, product, blog, and policy sitemap URLs, using a cross-market public facet union with no market path or query.
- Proved public HTML, canonical/hreflang metadata, Product JSON-LD, sitemaps, and robots remain identical across eight cookie/IP variants for 18 public surfaces, while private commerce still differs by market.
- Enforced `Cache-Control: private, no-store` for catalog and product projection success, invalid, not-found, and error outcomes.
- Promoted zero-tolerance static/cache security contracts for request APIs, complete cache arguments, caller-selected market, fingerprint authority, invalidation broadcasts, and sensitive logging.
- Passed a clean configured production build with all localized home, catalog, category, collection, technique, tag, and product routes classified static/ISR.

## Task Commits

1. **Task 1 RED: Add failing taxonomy sitemap contracts** - `f0fde77` (test)
2. **Task 1 GREEN: Publish localized taxonomy sitemaps** - `b6ebf95` (feat)
3. **Task 2 RED: Add failing response invariance gate** - `558f018` (test)
4. **Task 2 GREEN: Prove public and private response isolation** - `a84b46b` (feat)
5. **Task 3: Enforce storefront release boundaries** - `a94b5e3` (test)

## Files Created/Modified

- `src/app/sitemaps/[locale]/route.ts` - Builds locale-only sitemap URLs from deterministic public VN/INTL taxonomy facets.
- `tests/e2e/launch-seo.spec.ts` - Exercises 144 public cookie/IP comparisons plus private catalog/product cache isolation.
- `tests/e2e/catalog-detail-seo.spec.ts` - Verifies localized product metadata, JSON-LD invariance, fail-closed availability, and private commerce hydration.
- `tests/e2e/sitemap-robots.spec.ts` - Seeds disposable taxonomy fixtures and verifies localized XML and private-surface exclusion.
- `tests/unit/content/seo.test.ts` - Locks sitemap source contracts and every private projection response outcome.
- `tests/unit/content/json-ld.test.ts` - Preserves locale-default Product offers and unchanged Article/Breadcrumb structured data.
- `tests/unit/content/storefront-performance.test.ts` - Requires five-minute static/ISR contracts and complete shared-cache arguments.
- `tests/security/catalog-boundaries.test.mjs` - Rejects unsafe request APIs, market inputs, cache gaps, authority fingerprints, commerce broadcasts, and sensitive logging without conditional skips.

## Decisions Made

- Sitemaps use the union of public taxonomy facets from both markets because availability differs by market but discovery URLs must remain one locale-only index.
- Public-response comparison does not strip prices, headings, metadata, or structured data. Only request nonce, external Next build-script order, and non-JSON-LD runtime scripts are normalized.
- Private projection behavior is checked both by direct route-handler unit tests and browser-visible runtime requests so source markers alone cannot satisfy the gate.
- Production route classification is trusted only after moving previous `.next` output aside and performing a clean build against the configured Supabase schema.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Replaced stale product-detail fixture expectations**

- **Found during:** Task 2 browser verification
- **Issue:** The reviewed catalog projection no longer returns the legacy `both-market-bear` fixture, and fail-closed product copy had changed from stale assertions.
- **Fix:** Exercised the valid `intl-bear` projection and asserted current unavailable-region, physical fulfillment, metadata, offer, and stock behavior.
- **Files modified:** `tests/e2e/catalog-detail-seo.spec.ts`
- **Verification:** Final combined SEO browser gate passes all 11 tests without retries.
- **Committed in:** `a84b46b`

**2. [Rule 1 - Bug] Unified cached taxonomy fixture identities**

- **Found during:** Task 3 plan-wide E2E verification
- **Issue:** The launch and sitemap suites seeded equivalent taxonomy under different IDs, so the five-minute sitemap cache from the first suite made the second suite expect the wrong disposable URL.
- **Fix:** Both suites now use the same stable disposable technique and tag IDs while retaining per-file seed and cleanup.
- **Files modified:** `tests/e2e/launch-seo.spec.ts`
- **Verification:** Fresh three-file E2E command passes 11/11 with zero failures, retries, or flaky tests.
- **Committed in:** `a94b5e3`

**3. [Rule 3 - Blocking] Isolated clean build evidence from stale Next artifacts**

- **Found during:** Task 2 and Task 3 verification
- **Issue:** Next development and production caches could retain pre-reset data or a prior environment's compiled catalog projection, producing stale 404s or a false build result.
- **Fix:** Moved generated `.next` artifact trees to temporary recovery directories before environment-sensitive browser and production classification gates.
- **Files modified:** None; generated artifacts only.
- **Verification:** Clean configured build generates 127 pages and the classifier reports all seven required route families static/ISR.
- **Committed in:** Not applicable.

---

**Total deviations:** 3 auto-fixed (2 bugs, 1 blocking test-environment issue).
**Impact on plan:** All fixes make the planned SEO, cache, and release evidence deterministic without changing storefront authority, schema design, dependencies, or URL architecture.

## Issues Encountered

- The configured remote Supabase initially lacked reviewed migration `20260723193000_private_catalog_projection_authority.sql`, causing `catalog_query_failed` while collecting technique/tag page data. Execution paused; after explicit authorization and migration deployment, Local and Remote migration history matched and the clean classifier passed.
- Next dev rejects loopback Supabase image URLs as private upstream addresses during local E2E runs. Image fallbacks render, and the warning does not affect the asserted SEO or commerce contracts.

## Verification

- `node scripts/assert-storefront-route-classification.mjs` - clean configured build passed; 127 pages generated and all seven required route families classified static/ISR.
- Targeted unit release gate - 40/40 tests passed across four files, including 19/19 storefront performance checks.
- Required SEO browser gate - 11/11 tests passed across launch, catalog detail, and sitemap/robots suites with zero retries.
- `npm run test:security` - 48/48 boundary tests passed with zero skips.
- `npm run typecheck`, targeted ESLint, targeted Prettier, and `git diff --check` - passed.

## User Setup Required

None - the reviewed remote migration was applied and verified during the authorized continuation.

## Next Phase Readiness

- Plan 09-15 can perform final release/UAT verification with shared SEO responses proven market-invariant and personalized commerce confined to private no-store projections.
- The production schema, build route table, localized taxonomy discovery, and cache-security contracts are aligned with no remaining Plan 09-14 blockers.

## Self-Check: PASSED

- All eight implementation/test files and this summary exist on disk.
- Task commits `f0fde77`, `b6ebf95`, `558f018`, `a84b46b`, and `a94b5e3` exist in repository history.
- Clean build classification, unit, E2E, security, type, lint, formatting, and diff gates pass.

---

_Phase: 09-independent-locale-and-market-commerce-projection-with-seo-s_
_Completed: 2026-07-26_
