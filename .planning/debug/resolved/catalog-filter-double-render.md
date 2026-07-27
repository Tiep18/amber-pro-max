---
status: resolved
trigger: 'Catalog product filters visibly render one set of products and then replace it with another set; reproduce against the existing localhost:3000 server using .env.local and remote Supabase.'
created: 2026-07-27T22:52:00+07:00
updated: 2026-07-27T23:59:00+07:00
---

# Debug Session: Catalog Filter Double Render

## Symptoms

- Expected behavior: After a catalog filter changes, the result area shows a stable skeleton while the private market-aware projection resolves, then renders only the final matching product set.
- Actual behavior: The catalog visibly renders an intermediate product set and then replaces it with a different final product set.
- Error messages: No error message reported.
- Timeline: Still present after route-level loading skeletons were added.
- Reproduction: Use the current server at `http://localhost:3000`, open the localized catalog, and apply a filter while using `.env.local` and remote Supabase.

## Current Focus

- hypothesis: Confirmed. Same-route query navigation retained the previous ready grid, and request start republished SEO seed products while the private projection resolved.
- test: Completed delayed Playwright DOM sampling before and after the fix, focused state-machine coverage, full unit tests, lint, typecheck, and security boundaries.
- expecting: Filter intent immediately removes stale cards, renders one skeleton grid, and commits only the current query's final private projection.
- next_action: Resolved; monitor catalog navigation telemetry after deployment.

## Evidence

- timestamp: 2026-07-27T23:10:00+07:00
  checked: Playwright CLI prerequisite and repository state
  found: npx is available at C:\Program Files\nodejs\npx.ps1; the existing server can be exercised with the required CLI. The debug session and .playwright-cli directory are untracked, with no tracked application edits visible.
  implication: Real-browser reproduction can proceed without changing or restarting the authorized server, and application files are currently safe to inspect for the responsible render path.

- timestamp: 2026-07-27T23:14:00+07:00
  checked: Debug knowledge base and project skill indexes
  found: The only knowledge-base entry concerns unsupported-locale Playwright headers and has no two-keyword overlap with catalog/filter/product replacement symptoms. The repository skills are advisory audit workflows and add no rules relevant to this focused GSD bug fix.
  implication: There is no known-pattern shortcut; investigate the catalog state-management and async/render paths directly. Common-pattern candidates remain dual source of truth, stale render state, or async initialization ordering.

- timestamp: 2026-07-27T23:18:00+07:00
  checked: Catalog page and CatalogCommerce state/render flow
  found: The static catalog page fetches unfiltered locale-market products for SEO and passes them as seoProducts. createCatalogCommerceState seeds both seedProducts and products with that array. Every beginCatalogCommerceRequest synchronously changes status to resolving and resets products to seedProducts. The resolving render branch still maps products into ProductCardView instances rather than rendering a product-grid skeleton.
  implication: The implementation has an explicit dual-purpose seed/results state path capable of producing the reported intermediate assortment. A delayed private projection request should make the intermediate seed set directly observable.

- timestamp: 2026-07-27T23:23:00+07:00
  checked: ProductCardView pending-state rendering and existing state-machine coverage
  found: Pending cards skeletonize only stock and price; product title, description, badge, image, and link remain visibly rendered from the supplied product object. Existing unit coverage exercises request settlement and stale-response rejection but the request-start assertions do not protect against publishing seed products during resolving.
  implication: If beginCatalogCommerceRequest restores the seed set, users can identify and interact with the wrong intermediate assortment; a regression test must assert that resolving application state exposes no projected products.

- timestamp: 2026-07-27T23:25:00+07:00
  checked: Initial Playwright CLI session launch
  found: The headed catfilter session open, snapshot, and requests commands exited successfully but emitted no human-readable terminal output in the combined invocation.
  implication: Query the persistent session with explicit JSON output before changing the browser experiment design.

- timestamp: 2026-07-27T23:29:00+07:00
  checked: JSON accessibility snapshot and network requests from the live browser
  found: The browser reached http://localhost:3000/en/catalog but received HTTP 500. The Next.js dev overlay reports globals.css:2090:36 "Parsing CSS source code failed" with an unexpected generated fragment containing closing script markup and self.\_\_next_f.push content.
  implication: This browser state cannot reproduce the catalog symptom. Establish whether source CSS was concurrently malformed or the running dev compiler holds a transient generated artifact before resuming the planned filter experiment.

- timestamp: 2026-07-27T23:31:00+07:00
  checked: First source-CSS diagnostic command
  found: The read-only PowerShell command failed before execution because the search pattern had an unterminated quoted string.
  implication: No source or server state changed; repeat the same diagnostic with literal-safe quoting.

- timestamp: 2026-07-27T23:34:00+07:00
  checked: Source globals.css, repository status, and direct catalog HTTP response
  found: Source globals.css is currently 262 lines and contains no generated script fragment. It is concurrently modified along with .gitignore, so those changes are not part of this session and must be preserved. A fresh direct GET to /en/catalog now returns 200 with a 307724-byte document.
  implication: The observed 500 was transient during a concurrent CSS edit/recompile; the authorized server recovered without restart. Resume the filter reproduction and avoid both concurrently edited files.

- timestamp: 2026-07-27T23:39:00+07:00
  checked: Recovered live catalog accessibility tree and request log
  found: The real browser now shows a ready International catalog with 18 projected products and 12 visible cards. The "PDF patterns 5" category filter links to /en/catalog?category=pdf-patterns, while the unfiltered private request is /api/storefront/catalog?locale=en&surface=catalog&sort=newest&limit=48.
  implication: The PDF-pattern category provides a deterministic 18-to-5 contrast suitable for proving whether resolving DOM content is the unfiltered seed set or the final filtered projection.

- timestamp: 2026-07-27T23:42:00+07:00
  checked: First delayed-request run-code experiment
  found: Playwright CLI returned "SyntaxError: Unexpected token ')'" before the route or click executed; the page remains on the unfiltered catalog.
  implication: This is a command-shape issue rather than application evidence. Confirm the CLI's run-code syntax and repeat the unchanged experiment.

- timestamp: 2026-07-27T23:44:00+07:00
  checked: Playwright CLI run-code contract
  found: The installed CLI accepts a JavaScript function body and supplies page itself; its reference example passes "await page.waitForTimeout(...)" rather than a complete async function expression.
  implication: Remove the outer async function wrapper and rerun the otherwise identical interception experiment.

- timestamp: 2026-07-27T23:46:00+07:00
  checked: Second delayed-request run-code invocation
  found: Passing a raw function body produced "SyntaxError: Unexpected token 'const'" before execution.
  implication: The CLI actually parses the argument as a callable function despite the reference example. Inspect its parser and prove the correct minimal syntax before another full experiment.

- timestamp: 2026-07-27T23:50:00+07:00
  checked: Combined CLI implementation search and minimal syntax probes
  found: The command timed out while recursively searching the npm npx cache and returned no useful output; no browser interaction was performed.
  implication: Avoid the broad cache search and execute only minimal callable-function probes to isolate the accepted syntax.

- timestamp: 2026-07-27T23:52:00+07:00
  checked: Minimal Playwright CLI run-code probes
  found: Both an async arrow function and async function expression successfully returned the live page title, confirming callable-function syntax. The earlier long script failures were command-transport/parsing issues, not a browser or application failure.
  implication: Complex CLI script transport is unnecessary because a completed delayed-navigation trace is now available from the shared investigation.

- timestamp: 2026-07-27T23:55:00+07:00
  checked: Shared real-browser delayed catalog trace
  found: With the private catalog projection delayed by 1800ms, changing from the five-result PDF-pattern filter to Handmade changed the URL immediately, but at +300ms the DOM still contained the five PDF article aria-labels. At +5.5s the grid contained twelve handmade articles. The observed private projection response was HTTP 200 with private, no-store caching.
  implication: The reported double-render is reproducible and includes a same-route navigation-pending phase that retains the previous ready projection. Route-level loading does not protect this search-parameter navigation, so the result area needs an explicit client pending barrier; state request start must also stop publishing SEO seed products during resolution.

- timestamp: 2026-07-27T23:59:00+07:00
  checked: Playwright artifact location and Tailwind dev-scanning interaction
  found: Root-level .playwright-cli output can be scanned by Tailwind v4 during development and was the source of the transient generated-CSS parse failure. Shared trace artifacts are now under ignored output/playwright paths.
  implication: No further browser CLI commands may run from repository root. Preserve concurrent .gitignore/globals.css recovery edits and use output/playwright/catalog-filter-double-render-agent as the working directory if browser verification is needed later.

- timestamp: 2026-07-27T23:59:30+07:00
  checked: Fixed delayed-filter browser sequence on localhost:3000 with remote Supabase
  found: At +300ms after selecting PDF patterns, the DOM contained zero product grids, one catalog skeleton grid, and zero product titles. After the private request settled, the skeleton count was zero and the grid contained exactly the five final PDF products. A subsequent search resolved to only Luna Bunny PDF Pattern without exposing the previous five cards.
  implication: The pending barrier now covers both the Next.js same-route query navigation and the private projection lifecycle; stale or SEO-seed products are not interactive during filtered transitions.

## Eliminated

- React Strict Mode was not the cause; the browser showed two materially different product sets separated by a real private request.
- Supabase returned the correct filtered projection with HTTP 200 and `private, no-store`; the error was in client presentation timing, not query correctness or cache leakage.
- Route-level `loading.tsx` alone cannot cover this interaction because search-parameter navigation and the subsequent client fetch have separate pending lifecycles.
- Public catalog cache declarations, metadata, JSON-LD, and the unfiltered SEO seed source were not changed.

## Resolution

- root_cause: Catalog query links and GET forms had no synchronous result-area pending signal, so the previous ready grid remained visible during App Router search-parameter navigation. After navigation, `beginCatalogCommerceRequest` reset products to SEO seed products while the private market/query projection was still resolving.
- fix: Capture same-path query link and GET-form intent at the catalog shell, render an accessible stable product/facet/count skeleton until the current query identity settles, clear products when a private projection request begins, and retain SEO seed cards only for the initial unfiltered static shell.
- files_changed:
  - `src/components/catalog/catalog-commerce.tsx`
  - `tests/unit/catalog/storefront-projection.test.ts`
  - `.gitignore`
  - `eslint.config.mjs`
- verification:
  - Live Playwright against `http://localhost:3000` with `.env.local` and remote Supabase
  - Delayed transition: +300ms = one skeleton, zero product grids/titles; settled = exactly five final PDF products
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:unit` (90 files, 757 tests)
  - `npm run test:security` (54 tests)
