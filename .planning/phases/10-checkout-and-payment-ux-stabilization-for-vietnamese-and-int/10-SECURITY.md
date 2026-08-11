---
phase: 10
slug: checkout-and-payment-ux-stabilization-for-vietnamese-and-int
status: verified
threats_open: 0
asvs_level: 1
block_on: high
register_authored_at_plan_time: true
baseline_commit: a7f51be6
audited_commit: 65d4a145
created: 2026-08-11
---

# Phase 10 — Security

> Plan-time threat-mitigation verification. Implementation and test files were treated as read-only; documentation, summaries, and prior verification were not accepted as substitutes for code evidence.

## Audit Scope and Register Normalization

- Source register: all `<threat_model>` blocks in `10-01-PLAN.md` through `10-07-PLAN.md`.
- The range rows in `10-07-PLAN.md` are roll-ups of `T10-01` through `T10-11`, not additional threats.
- `T10-SC` is repeated in all seven plans and is normalized to one phase-wide negative supply-chain/schema control.
- Unique register: 12 threats (`T10-01` through `T10-11`, plus `T10-SC`).
- SUMMARY threat flags: `10-01-SUMMARY.md` through `10-06-SUMMARY.md` contain no `## Threat Flags` section; `10-07-SUMMARY.md` explicitly reports none.
- Configuration gate: `workflow.security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high`.

## Trust Boundaries

| Boundary | Description | Data crossing |
|---|---|---|
| Browser intent → authoritative cart/checkout services | Quantity, removal, address, discount, provider and submit intent are forgeable. | Cart lines, address PII, quote hashes, payment intent |
| `sessionStorage` → checkout UI | Stored editable PII is untrusted, tab-scoped convenience data only. | Email and editable shipping address |
| Browser save consent → authenticated RPC/RLS | A caller may request a save but must not select the account owner. | Address PII and save consent |
| Checkout state owner → responsive presentations | Mobile and desktop children must remain render-only and must not create alternate commerce state. | Accepted quote, destination, discount, blockers, totals |
| Server environment/error handling → public UI | Only validated support DTO fields and opaque incident identifiers may cross. | Optional support URLs, timezone, incident UUID |
| Authorized order projection → payment/recovery UI | The browser may render and restore intent but cannot establish paid, inventory or fulfillment truth. | Order/payment state, recovery snapshot, masked email |
| Authorized order → external VietQR image | Authorization must precede a fixed and bounded external fetch. | Order reference, amount, QR image bytes |
| Verified payment → private downloads | Paid presentation cannot bypass active entitlement and short-lived signed-link authorization. | Entitlement, owner/guest proof, private object URL |

## Threat Register

| Threat ID | Source plan(s) | Category | Component | Disposition | Declared mitigation | Status |
|---|---|---|---|---|---|---|
| T10-01 | 10-01, roll-up 10-07 | Tampering / Repudiation | PDP/cart checkout intent | mitigate | Exact agreement and quote lines; mutation-specific locks; authoritative linked blockers; regression protection against client totals/eligibility authority. | closed |
| T10-02 | 10-02, roll-up 10-07 | Tampering | VN province/ward/mobile payload | mitigate | Strict Zod parsing and official pair/mobile normalization at final submit and authenticated save boundaries. | closed |
| T10-03 | 10-02, roll-up 10-07 | Information Disclosure / Tampering | Editable checkout draft | mitigate | Strict allowlist, 12-hour TTL, 16 KiB cap, current-version-only reads, cleanup, forbidden-field gate and no PII logging. | closed |
| T10-04 | 10-02, roll-up 10-07 | Elevation of Privilege | Save address | mitigate | Server-derived identity, existing RPC/RLS, no caller user ID and no direct client table write. | closed |
| T10-05 | 10-03, roll-up 10-07 | Tampering / Denial of Service | Duplicate responsive state or hidden blocker | accept | One view model, active-breakpoint focus exclusion, stable linked blockers and cross-viewport state-equality tests. | closed — accepted risk |
| T10-06 | 10-04, roll-up 10-07 | Tampering / Repudiation | Submit lifecycle | mitigate | Full-form lock, idempotency reuse, authoritative preflight, unknown-outcome no-resubmit copy and server-success-only navigation. | closed |
| T10-07 | 10-04, roll-up 10-07 | Information Disclosure / Spoofing | Support config and incident/access errors | mitigate | Server-only resolver, validated narrow DTO, exact Zalo host, no client env import, opaque incident ID and generic denial. | closed |
| T10-08 | 10-05, roll-up 10-07 | Tampering / Repudiation | Terminal payment recovery | mitigate | `sameOrderRetryAllowed: false`, no terminal provider/checkout action and restore intent through a fresh cart. | closed |
| T10-09 | 10-05, roll-up 10-07 | Tampering | Paid/deadline presentation | mitigate | Authorized server projection only, deadline only while pending/verifying and no browser paid mutation/state machine. | closed |
| T10-10 | 10-06, roll-up 10-07 | Spoofing / Information Disclosure / Denial of Service | QR attachment | mitigate | Authorization-first fixed fetch; no caller URL; redirect, timeout, 1 MiB and MIME bounds; sanitized filename; private no-store; generic denial; no sensitive logging. | closed |
| T10-11 | 10-06, roll-up 10-07 | Tampering / Elevation of Privilege | Paid success/private downloads | mitigate | Verified-paid server projection; declaration cannot mark paid; entitlement-authorized short-lived signed link; masked email. | closed |
| T10-SC | 10-01 through 10-07 | Tampering | Package/schema supply chain | avoid (negative control) | No package/lockfile, migration, generated database type, RLS, storage-bucket or provider-SDK drift in the phase. | closed |

## Threat Verification Evidence

| Threat ID | Code evidence | Test/gate evidence | Result |
|---|---|---|---|
| T10-01 | `src/components/catalog/add-to-cart.tsx:88-124,227-236,290-320` requires an exact projection agreement and emits intent-only lines. `src/components/cart/cart-page.tsx:69-113,217-280` and `src/components/cart/mini-cart.tsx:71-108,255-299` render quote lines/subtotal, mask unsafe commerce values, keep removal available independently, and link disabled checkout controls to authoritative blockers. | `tests/unit/catalog/add-to-cart.test.ts:116-170`; `tests/e2e/cart.spec.ts:82-105,122-170`. | CLOSED |
| T10-02 | `src/checkout/schemas.ts:18-74` performs strict final submit parsing and normalization. `src/checkout/shipping-address.ts:43-52,95-127,192-229` calls `normalizeVietnamPhone` and `validateVietnamAddress`; `src/checkout/vietnam-address.ts:63-102` constrains a ward to its official province; `src/checkout/vietnam-phone.ts:9-23` canonicalizes accepted mobile forms. The authenticated save path re-parses at `src/account/address-actions.ts:282-294`. | Focused unit gate: 9 files, 94/94 passed. ASVS source gate: `tests/security/checkout-boundaries.test.mjs:359-392`. | CLOSED |
| T10-03 | `src/checkout/editable-draft.ts:6-11,56-106,136-189,192-238` implements v2-only exact keys, 12-hour expiry, 16 KiB pre/post serialization bounds and cleanup. `src/checkout/editable-draft-scope.server.ts:1-16` uses a server-only HMAC account scope. `src/app/[locale]/checkout/page.tsx:16-38` derives that scope from authenticated server identity; `src/components/checkout/checkout-page.tsx:416-441,819-820` hydrates/writes by scope and clears only after success. | `tests/unit/checkout/editable-draft.test.ts:82-177`; forbidden-field/no-console gate at `tests/security/checkout-boundaries.test.mjs:83-125,191-218,359-382`. | CLOSED |
| T10-04 | `src/account/address-actions.ts:224-226,282-300` requires authentication and exposes no caller identity field; the RPC arguments at `:117-129` contain address data only. Existing RLS and `auth.uid()` ownership are enforced by `supabase/migrations/20260620102618_customer_retention_trust.sql:25-54,56-148`. Checkout treats optional save failure separately after order success at `src/components/checkout/checkout-page.tsx:795-838`. Repository search found no direct client write to `customer_shipping_addresses`. | `tests/security/checkout-boundaries.test.mjs:314-325,359-392`; focused address unit coverage passed. | CLOSED |
| T10-05 | `src/components/checkout/order-summary.tsx:48-65,103-134` creates one frozen model; `:149-191,210-243` gives stable surface-specific blocker IDs, uses `hidden` for collapsed content, and excludes inactive breakpoints with `lg:hidden`. `src/components/checkout/checkout-page.tsx:590-599,900-907,1125-1143` passes the same model to mobile disclosure, desktop rail and mobile dock. | `tests/e2e/checkout-ux.spec.ts:59-116` covers five viewports, reflow, active submit visibility and 44 px targets, but contains no assertion comparing accepted quote, destination, discount, blocker, total or payment facts across mobile and desktop. Repository-wide searches found no test reference to `buildOrderSummaryViewModel`, `OrderSummaryViewModel`, `checkout-total-summary-mobile`, `checkout-payment-method-mobile`, or paired mobile/desktop blocker facts. Project owner explicitly accepted the residual regression-detection risk on 2026-08-11. | CLOSED — accepted risk with shared-view-model compensating control. |
| T10-06 | `src/components/checkout/checkout-page.tsx:318,337,520-575,662-675,735-850,909-1048` supplies a duplicate-submit ref guard, locks nested controls through both submit stages, requotes immediately before submission, reuses a quote-scoped idempotency key and navigates only in the success branch. `src/checkout/idempotency.ts:88-115` reuses a durable key for the same quote. `src/checkout/submit-error-copy.ts:109-131` marks an unknown outcome as no-resubmit when dedupe is not guaranteed. | `tests/unit/checkout/idempotency.test.ts:34-192`; `tests/security/checkout-boundaries.test.mjs:234-294`. | CLOSED |
| T10-07 | `src/support/config.ts:1-47` is server-only, validates email/timezone and requires exact HTTPS `zalo.me`; `src/app/[locale]/checkout/page.tsx:12-39` resolves and hands off only `PublicSupportConfig`. `src/components/support/incident-reference.tsx:11-59` renders only a copyable identifier; its backing record ID is a database UUID (`supabase/migrations/20260623070600_operations_errors.sql:1-2`, returned at `src/operations/errors.ts:40-58`). Every non-found order result shares the generic branch at `src/components/payments/order-payment-page.tsx:60-93`. | `tests/security/checkout-boundaries.test.mjs:327-356`; `tests/security/payment-boundaries.test.mjs:156-170`. | CLOSED |
| T10-08 | `src/payments/status.ts:62-69,129-139` makes every terminal state non-retryable. `src/payments/order-recovery.ts:10-30` allows only cart restore/catalog fallback for failed, cancelled, rejected and expired states. `src/components/payments/order-recovery-banner.tsx:49-105` restores through cart authority; provider controls in `src/components/payments/order-payment-page.tsx:133-157,247-350` are pending-only. | `tests/unit/payments/order-recovery.test.ts:1-33`; `tests/security/payment-boundaries.test.mjs:172-184,204-212`; UAT test 4 passed at commit `65d4a145`. | CLOSED |
| T10-09 | `src/components/payments/order-payment-page.tsx:60-102` obtains the authorized server projection before mapping state. `src/payments/status.ts:95-139,142-179` owns paid/terminal/deadline facts; `src/components/payments/order-payment-page.tsx:133-160,183-221` renders paid success or pending deadlines from those facts only. No client payment mutation/state-machine shortcut exists in the surface. | `tests/unit/payments/status-mapping.test.ts:89-178`; `tests/security/payment-boundaries.test.mjs:186-212,261-276`. | CLOSED |
| T10-10 | `src/app/[locale]/orders/[orderNumber]/qr/route.ts:85-125` validates params and authenticates/authorizes before URL derivation; `:42-51,127-190` constrains HTTPS `img.vietqr.io/image/*.png`, denies redirects, applies an 8 s abort, validates `image/png`, enforces a streamed 1 MiB cap, sanitizes the filename, returns private/no-store/nosniff headers and uses generic errors without logging. No caller URL/body is consumed. | Runtime boundary at `tests/unit/payments/vietqr-download-route.test.ts:82-123`; source gates at `tests/security/payment-boundaries.test.mjs:214-259`; UAT test 3 passed at commit `65d4a145`. | CLOSED |
| T10-11 | `src/components/payments/order-payment-page.tsx:60-102,155-180,352-380` gates confirmation/download/tracking on the authorized paid projection and renders `contactEmailMasked`; masking occurs at `src/payments/queries.ts:320-375`. `src/payments/vietqr/customer-actions.ts:20-49` can call only the declaration RPC; the RPC updates `customer_transfer_declared_at` while leaving payment/fulfillment/entitlement state untouched (`supabase/migrations/20260801160000_vietqr_customer_declaration.sql:217-269`). `/api/downloads` delegates to entitlement authorization (`src/app/api/downloads/route.ts:18-38`); `src/fulfillment/downloads.ts:103-171` checks active entitlement plus owner/expiring guest token before a 300-second signed URL, created server-side at `src/fulfillment/downloads.server.ts:90-105`. | `tests/security/payment-boundaries.test.mjs:261-335`; focused paid/status/QR unit gate passed. | CLOSED |
| T10-SC | Diff from baseline `a7f51be6` to audited commit `65d4a145` returned no changed `package.json`, lockfile, `supabase/migrations/**`, `src/types/supabase.ts`, or Supabase/RLS config. Phase support additions are limited to `.env.example` and `src/lib/env/server.ts`. | `git diff --name-only a7f51be6..65d4a145 -- package.json package-lock.json pnpm-lock.yaml yarn.lock supabase/migrations src/types/supabase.ts supabase/config.toml` → no output. | CLOSED |

## Open Threats

None. T10-05 was explicitly accepted by the project owner with the controls and review triggers recorded below.

## Unregistered Flags

None. The only explicit `## Threat Flags` section (`10-07-SUMMARY.md`) states that no new endpoint, authentication path, file-access pattern, schema, package, migration, RLS policy or trust boundary was introduced. Per the plan-time-register rule, this audit did not perform retroactive threat discovery.

## Accepted Risks Log

| Threat ID | Severity | Owner | Decision | Rationale | Compensating controls | Review trigger | Accepted on |
|---|---|---|---|---|---|---|---|
| T10-05 | High | Project owner | Accept the missing dedicated cross-viewport state-equality assertion for Phase 10. | Mobile and desktop receive the same frozen `OrderSummaryViewModel`; existing E2E covers responsive reflow, one active submit surface and touch targets, while full UAT passed. The residual risk is a future presentation regression that existing tests might detect less directly. | One shared model, breakpoint-based focus exclusion, stable linked blocker IDs, focused unit/security gates and bilingual viewport E2E coverage. | Reopen when mobile or desktop order-summary composition changes, when a separate responsive state owner is introduced, or before a release where checkout presentation is materially refactored. | 2026-08-11 |

## Gate Evidence

| Gate | Result |
|---|---|
| Audited commit | `65d4a145` |
| Post-review UAT | 4/4 passed, 0 issues at `65d4a145`; Phase 09 geo/SEO excluded |
| `npm run test:security` | 77/77 passed, 0 skipped/todo |
| Focused unit gate | 9 files, 94/94 passed |
| Supply-chain/schema diff | No package, lockfile, migration, generated database type or RLS-config change from `a7f51be6` to `65d4a145` |
| Dirty-worktree preservation | Pre-existing modifications to `10-VERIFICATION.md` and `next-env.d.ts` were not touched |
| Accepted-risk approval | Project owner selected option 2 for T10-05 on 2026-08-11 |

T10-05 is closed by explicit risk acceptance, not by claiming the missing equality test exists.

## Security Audit Trail

| Audit Date | Register origin | Threats Total | Closed | Open | Unregistered Flags | Run By |
|---|---|---:|---:|---:|---:|---|
| 2026-08-11 | Plan-time (`10-01` through `10-07`) | 12 | 12 | 0 | 0 | Codex / `gsd-security-auditor`; project-owner risk approval |

## Sign-Off

- [x] Every unique plan-time threat is registered and has a disposition.
- [x] Accept/transfer dispositions verified; T10-05 has an explicit owner, rationale and review trigger.
- [x] SUMMARY threat flags incorporated.
- [x] `threats_open: 0` confirmed.
- [x] `status: verified` set in frontmatter.

**Approval:** THREAT-SECURE — all registered threats are mitigated, avoided or explicitly accepted.
