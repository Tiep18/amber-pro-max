# Phase 5: Fulfillment and Purchase Access - Research

**Researched:** 2026-06-19
**Domain:** Next.js 16 + Supabase Postgres/RLS/Auth/Storage fulfillment, secure downloads, transactional email outbox, customer access, and admin fulfillment operations
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
### Digital Entitlements and Downloads
- **D-01:** Digital entitlements are granted per paid digital order line. Each paid digital line creates its own entitlement so mixed orders, duplicate purchases, refunds/revocations, and audits remain clear.
- **D-02:** The customer pattern library groups repeated purchases by pattern for a clean customer experience, while preserving the underlying order and entitlement history for audit and admin operations.
- **D-03:** Download links sent by email live for 24 hours.
- **D-04:** Expired links are regenerated from an authorized order page or signed-in pattern library action. The system must validate the entitlement before creating a new short-lived signed Storage URL or access token.
- **D-05:** Purchased PDFs must never be made public, attached directly to email, or exposed through durable public URLs. All download requests validate an active entitlement before issuing short-lived access.
- **D-06:** Guest customers reopen order/download access through an email magic token. The token must expire and must validate order email/access before any fresh download link is issued.
- **D-07:** Guest magic tokens live for 24 hours.
- **D-08:** Claiming a prior guest order into an account requires the customer to be signed in with the same email address as the order and to prove control through an email token.
- **D-09:** After a guest order is claimed into an account, old guest access tokens are revoked. Long-term access should flow through the signed-in account boundary.
- **D-10:** Transactional email requests are created durably in the same transaction that opens fulfillment or creates the entitlement-related work. Sending happens later through an outbox worker/job so provider failures do not lose email intent or corrupt paid transitions.
- **D-11:** Temporary email failures are retried automatically with backoff, while admins can inspect sanitized failure details and intervene.
- **D-12:** Admin resend of a download email creates a new email request with a new token/link and an audit record. It must not reuse expired links or expose public PDF URLs.
- **D-13:** Phase 5 admin UI needs a compact failed-email queue in admin orders/operations, showing order, email type, attempt count, sanitized error, next retry time, and controlled retry/resend actions.
- **D-14:** Physical fulfillment uses the manual status flow `awaiting_fulfillment -> packing -> shipped -> delivered`.
- **D-15:** Carrier and tracking number are optional but encouraged when an order moves to `shipped`. The workflow must not block shipment status if the seller has no tracking number.
- **D-16:** Customer-facing mixed order status must clearly separate digital and physical progress, for example "Digital ready" and "Physical in progress", so a ready PDF does not imply the physical shipment is complete.
- **D-17:** Shipping update email is required when an order is marked `shipped`. A delivered email is optional when admin marks the order delivered.

### the agent's Discretion
- Exact database enum names, token table names, and job scheduling mechanics may be chosen during planning, provided they preserve the locked access-control, audit, retry, and mixed-fulfillment behavior above.
- Exact customer copy, empty states, and admin queue layout may follow existing bilingual UI and admin order patterns.
- Exact resend/rate-limit thresholds may be chosen during planning, provided guest token and download regeneration flows remain abuse-resistant and do not leak cross-user data.

### Deferred Ideas (OUT OF SCOPE)
None - discussion stayed within phase scope.
</user_constraints>

## Project Constraints (from AGENTS.md)

- Keep Vietnam and international market behavior separate for availability, pricing, payment, shipping, language, and currency. [VERIFIED: AGENTS.md]
- Never grant digital fulfillment until the full order is confirmed paid. [VERIFIED: AGENTS.md]
- Deliver PDFs through expiring, access-controlled links only; do not make PDFs public. [VERIFIED: AGENTS.md]
- Guest checkout must remain supported; account creation cannot be required to purchase. [VERIFIED: AGENTS.md]
- Mixed digital and physical cart/order behavior is in scope; physical shipping remains manual with stored fees, status, and tracking. [VERIFIED: AGENTS.md]
- Use Next.js App Router, Supabase Postgres/Auth/Storage, `@supabase/ssr`, `next-intl`, Tailwind, shadcn/ui primitives, Zod, Resend, Vitest, and Playwright as the standard stack. [VERIFIED: AGENTS.md]
- Do not introduce public PDF URLs, floating-point money, automatic exchange-rate pricing, user-editable metadata authorization, or microservices for v1. [VERIFIED: AGENTS.md]
- Start repo edits through a GSD workflow; this research artifact is part of the active GSD planning workflow. [VERIFIED: AGENTS.md]

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DIG-02 | System creates a digital entitlement only after the containing order is confirmed paid. | Use `apply_payment_transition` paid gate plus an idempotent entitlement creation function keyed per paid digital order line. [VERIFIED: codebase grep] |
| DIG-03 | Paid customer receives an email with an expiring link for each purchased PDF. | Use durable outbox rows plus Resend server-side sending and 24-hour link/token lifetimes. [CITED: https://resend.com/docs/send-with-nextjs] |
| DIG-04 | Every download request validates an active entitlement before generating a short-lived signed storage URL. | Use server-side entitlement validation before Supabase Storage `createSignedUrl`. [CITED: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl] |
| DIG-05 | Signed-in customer can re-download purchased PDFs from a personal pattern library. | Add owner-scoped entitlement/library projections and RLS policies keyed to `owner_user_id`. [VERIFIED: codebase grep] |
| DIG-06 | Guest customer can securely reopen an order and request a fresh download link using an expiring access token. | Add hashed 24-hour guest reopen tokens separate from checkout guest cookies. [VERIFIED: 05-CONTEXT.md] |
| DIG-07 | Admin can resend a download email or revoke/reissue digital access with an audit record. | Add admin server actions/RPCs for entitlement status changes, email outbox enqueue, and audit events. [VERIFIED: codebase grep] |
| FUL-01 | A mixed order releases eligible PDFs after full payment while physical lines remain awaiting fulfillment. | Existing paid transition already sets digital `eligible` and physical `awaiting_fulfillment` separately. [VERIFIED: codebase grep] |
| FUL-02 | Admin can update physical fulfillment status and add carrier and tracking information. | Extend physical fulfillment state from Phase 4's `awaiting_fulfillment` to the locked manual flow. [VERIFIED: 05-CONTEXT.md] |
| FUL-03 | Customer receives shipping updates by email and can view tracking on the order page. | Use the same transactional outbox for shipping notifications and customer order detail tracking display. [VERIFIED: codebase grep] |
| ACC-02 | Signed-in customer can view only their own order history, order details, payments, downloads, and tracking. | Existing owner RLS and `get_order_payment_status` patterns should be extended with filtered customer queries. [VERIFIED: codebase grep] |
| ACC-05 | Guest customer can claim prior orders into an account after verifying control of the order email. | Require signed-in same-email user plus email token proof, then revoke guest tokens. [VERIFIED: 05-CONTEXT.md] |
| OPS-01 | Transactional email requests are stored durably and retried safely after transient failures. | Use a database outbox with status, attempts, next retry, idempotency key, and sanitized error fields. [CITED: https://resend.com/docs/dashboard/emails/idempotency-keys] |
| OPS-02 | Admin can inspect failed transactional emails and trigger a controlled resend. | Add admin failed-email queue and controlled retry/resend actions. [VERIFIED: 05-CONTEXT.md] |
</phase_requirements>

## Summary

Phase 5 should be planned as a fulfillment layer on top of Phase 4's paid gate, not as another payment system. `public.apply_payment_transition(jsonb)` already opens separate digital and physical fulfillment statuses after confirmed payment, and existing order/customer/admin views provide the natural extension points. [VERIFIED: codebase grep]

The recommended implementation is an idempotent Supabase/Postgres fulfillment command that creates one active entitlement per paid digital order line, records durable email outbox work in the same transaction, and keeps sending/retry outside the payment transition path. [VERIFIED: 05-CONTEXT.md] Download links should be generated only after server-side entitlement validation, using private `pattern-pdfs` objects and fixed-duration Supabase signed URLs. [CITED: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl]

Resend is the standard email provider from the project stack and official docs support a server-side Next.js SDK integration. [VERIFIED: AGENTS.md] Its API-level idempotency keys last 24 hours, so the application still needs its own durable outbox state for long-lived audit, retries, resend decisions, and failure visibility. [CITED: https://resend.com/docs/dashboard/emails/idempotency-keys]

**Primary recommendation:** Plan a database-first fulfillment subsystem: entitlements, access tokens, outbox, fulfillment events, and audit tables in Supabase; Next.js route handlers/server actions for authorization and provider I/O; UI as thin customer/admin projections. [VERIFIED: codebase grep]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|--------------|----------------|-----------|
| Paid entitlement creation | Database / Storage | API / Backend | Entitlements must be transactional with paid-state facts and order lines; the API invokes the command but should not hand-assemble authority. [VERIFIED: codebase grep] |
| Download link issue/regeneration | API / Backend | Database / Storage | Server validates entitlement and token context, then creates a Supabase signed URL for a private object. [CITED: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl] |
| Signed-in order history and pattern library | Frontend Server (SSR) | Database / Storage | Account pages should render owner-filtered data through server-side Supabase clients and RLS-backed queries. [VERIFIED: codebase grep] |
| Guest reopen and claim | API / Backend | Database / Storage | Token verification, same-email matching, token revocation, and ownership updates are security-sensitive server/database operations. [VERIFIED: 05-CONTEXT.md] |
| Transactional email outbox | Database / Storage | API / Backend | Durable request state, retry counters, idempotency keys, and audit need database ownership; provider send happens server-side. [CITED: https://resend.com/docs/api-reference/emails/send-email] |
| Outbox worker scheduling | Database / Storage | API / Backend | Supabase Cron can run SQL/database functions or HTTP requests and is the native scheduler already aligned with Supabase operations. [CITED: https://supabase.com/docs/guides/cron] |
| Physical fulfillment and tracking | API / Backend | Database / Storage | Admin actions mutate fulfillment records/status and enqueue notifications under server-side authorization. [VERIFIED: codebase grep] |
| Customer/admin UI | Browser / Client | Frontend Server (SSR) | UI should display server-authorized projections and call server actions; it must not carry PDF paths, service keys, or authoritative state changes. [VERIFIED: AGENTS.md] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.9 | App Router pages, route handlers, server actions, SSR account/admin pages | Existing app is Next.js 16.2.9 and Phase 5 needs server-side access control plus localized routes. [VERIFIED: package.json] |
| React | 19.2.7 | Customer/admin components and optional React email body rendering | Existing app is React 19.2.7 and Resend supports React content in the Node SDK. [VERIFIED: package.json] [CITED: https://resend.com/docs/send-with-nextjs] |
| TypeScript | 5.9.3 | Typed commerce/access/email state machines | Existing repo uses TypeScript and generated Supabase types. [VERIFIED: package.json] |
| Supabase Postgres/Auth/Storage | Managed current + CLI 2.106.0 | Entitlements, RLS, tokens, private PDFs, cron/job state | Existing migrations use Supabase Postgres, RLS, private storage, and SQL functions. [VERIFIED: codebase grep] |
| Resend | 6.14.0 | Transactional email provider | Official Next.js docs install `resend`; package exists on npm with source repo and no `postinstall` script, but latest version is flagged `SUS` due recent publish. [CITED: https://resend.com/docs/send-with-nextjs] [VERIFIED: npm registry] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@supabase/supabase-js` | 2.108.1 | Server-side Storage signed URLs and service/client database operations | Use trusted server clients for signed URL generation after entitlement checks. [VERIFIED: package.json] [CITED: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl] |
| `@supabase/ssr` | 0.12.0 | Cookie-aware server/browser Supabase clients | Use existing SSR clients for signed-in customer account and admin routes. [VERIFIED: package.json] |
| `next-intl` | 4.13.0 | Localized account/order/library/email copy | Phase 5 customer routes and emails are bilingual. [VERIFIED: package.json] |
| Zod | 4.4.3 | Runtime validation for admin actions, token inputs, and email payloads | Use at route/server-action boundaries. [VERIFIED: package.json] |
| Vitest | 4.1.8 | Unit tests for token, email, state, and query helpers | Existing unit test command is `npm run test:unit`. [VERIFIED: package.json] |
| Playwright | 1.60.0 | Browser tests for customer/admin access paths | Existing e2e command is `npm run test:e2e`. [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Database outbox + Supabase Cron | Direct send inside payment transition route | Direct send couples provider failures to paid-state transitions and violates locked durable outbox decision. [VERIFIED: 05-CONTEXT.md] |
| Resend SDK | Raw Resend REST fetch | Raw fetch avoids one package but duplicates SDK request/error handling and loses the project stack recommendation. [CITED: https://resend.com/docs/send-with-nextjs] |
| App-generated tokens + Storage signed URLs | Direct Storage RLS policy letting customers read PDFs | Direct customer Storage reads risk exposing object paths and make guest/signed-in/revocation semantics harder to audit. [CITED: https://supabase.com/docs/guides/storage/security/access-control] |
| Supabase Cron worker | Vercel Cron route | Vercel Cron is viable on Vercel, but Supabase Cron keeps retry selection near the outbox table and can run SQL functions directly. [CITED: https://supabase.com/docs/guides/cron] |

**Installation:**
```bash
npm install resend@6.14.0
```

**Version verification:** `npm view resend version time dist-tags repository.url scripts.postinstall` returned version `6.14.0`, package creation date `2017-02-25`, latest version publish date `2026-06-17`, source repo `github.com/resend/resend-node`, and no `scripts.postinstall` value. [VERIFIED: npm registry]

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source Repo | Verdict | Disposition |
|---------|----------|-----|-----------|-------------|---------|-------------|
| `resend` [WARNING: flagged as suspicious — verify before using.] | npm | Package created 2017-02-25; latest `6.14.0` published 2026-06-17 | 7,403,783/week | `github.com/resend/resend-node` | SUS | Flagged — planner must add `checkpoint:human-verify` before install. [VERIFIED: npm registry] |

**Packages removed due to [SLOP] verdict:** none. [VERIFIED: package-legitimacy seam]
**Packages flagged as suspicious [SUS]:** `resend` because the latest publish is less than three days old, even though the package is official and high-download. [VERIFIED: package-legitimacy seam]

*Packages discovered via WebSearch or training data that have not been verified against an authoritative source are tagged `[ASSUMED]` and the planner must gate each install behind a `checkpoint:human-verify` task.*

## Architecture Patterns

### System Architecture Diagram

```text
Payment provider/admin confirmation
  -> Phase 4 apply_payment_transition(jsonb)
  -> paid gate opens and sets digital/physical fulfillment statuses
  -> Phase 5 fulfill_paid_order(order_id)
      -> select paid digital checkout_order_lines
      -> create/update one entitlement per digital line
      -> enqueue download email requests in transactional_email_outbox
      -> audit entitlement/email work
      -> digital status becomes ready/complete

Customer signed-in account
  -> SSR account/order/library routes
  -> owner-filtered entitlement/order projections
  -> request fresh download
  -> server validates active entitlement
  -> Supabase Storage createSignedUrl(private pattern-pdfs object, short TTL)
  -> redirect/download response

Guest email reopen
  -> 24h magic token
  -> server hashes token and validates order email/token status
  -> authorized order page
  -> entitlement validation
  -> short-lived signed Storage URL or fresh email token

Outbox worker
  -> Supabase Cron / admin retry trigger
  -> claim due email outbox rows
  -> Resend send with idempotency key
  -> record provider id or sanitized failure
  -> schedule backoff or expose failed row in admin queue

Admin fulfillment
  -> requireAdmin server action/RPC
  -> update physical status/tracking
  -> audit event
  -> enqueue shipping email when shipped
  -> customer order page shows split digital/physical status
```

### Recommended Project Structure

```text
src/
├── fulfillment/                 # entitlement, download, outbox, physical fulfillment domain logic
│   ├── entitlements.ts
│   ├── downloads.ts
│   ├── email-outbox.ts
│   ├── physical.ts
│   └── schemas.ts
├── app/[locale]/account/
│   ├── orders/                  # signed-in order history/detail
│   └── patterns/                # grouped pattern library
├── app/[locale]/orders/[orderNumber]/
│   └── page.tsx                 # extend existing localized order page
├── app/[locale]/guest-order/
│   └── page.tsx                 # guest reopen/claim token flow
├── app/api/downloads/
│   └── route.ts                 # entitlement-checked signed URL issue/redirect
├── components/fulfillment/      # customer status/download/tracking panels
├── components/admin/fulfillment/ # email queue, entitlement actions, tracking form
└── emails/                      # localized email rendering helpers
```

### Pattern 1: Idempotent Entitlement Creation

**What:** Create entitlements with a unique key on `order_line_id` plus an active/revoked status model; repeated paid fulfillment calls must return existing rows rather than duplicate access. [VERIFIED: 05-CONTEXT.md]

**When to use:** Run after Phase 4 paid transition opens digital fulfillment, including duplicate webhook/admin retries. [VERIFIED: codebase grep]

**Example:**
```sql
-- Source: existing Phase 4 idempotent apply_payment_transition pattern plus Phase 5 D-01.
insert into public.digital_entitlements (
  order_id,
  order_line_id,
  product_id,
  owner_user_id,
  contact_email,
  status
)
select co.id, col.id, col.product_id, co.owner_user_id, co.contact_email, 'active'
from public.checkout_orders co
join public.checkout_order_lines col on col.order_id = co.id
where co.id = target_order_id
  and co.payment_status = 'paid'
  and col.fulfillment_type = 'digital'
on conflict (order_line_id) do update
set status = case
  when public.digital_entitlements.status = 'revoked' then 'revoked'
  else public.digital_entitlements.status
end;
```

### Pattern 2: Entitlement-Checked Signed URL Issue

**What:** Validate owner, active entitlement, matching product asset, and non-expired guest/signed-in proof before calling Storage `createSignedUrl`. [CITED: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl]

**When to use:** Email links, order page downloads, pattern library regeneration, and admin reissue flows. [VERIFIED: 05-CONTEXT.md]

**Example:**
```typescript
// Source: Supabase createSignedUrl docs + project private bucket constraint.
const {data, error} = await supabase.storage
  .from('pattern-pdfs')
  .createSignedUrl(asset.object_path, 60 * 15);
```

### Pattern 3: Durable Email Outbox with Provider Idempotency

**What:** Store the business email request before provider I/O, then send with a stable outbox-row idempotency key and persist provider result/failure. [VERIFIED: 05-CONTEXT.md] Resend idempotency keys prevent duplicate provider sends for 24 hours, but app outbox rows are still the long-lived source of truth. [CITED: https://resend.com/docs/dashboard/emails/idempotency-keys]

**When to use:** Download emails, guest reopen emails, claim emails, shipping updates, delivered emails, and admin resend. [VERIFIED: 05-CONTEXT.md]

**Example:**
```typescript
// Source: Resend Send Email and Idempotency Keys docs.
const {data, error} = await resend.emails.send(
  {
    from,
    to: [recipient],
    subject,
    html,
    text
  },
  {
    idempotencyKey: `email-outbox/${outboxId}`
  }
);
```

### Anti-Patterns to Avoid

- **Creating signed URLs during payment verification:** Provider outages or duplicate webhooks should not cause duplicate entitlements or leaked download links. [VERIFIED: 05-CONTEXT.md]
- **Emailing PDFs as attachments:** Resend supports attachments, but project constraints prohibit attaching purchased PDFs because attachments bypass durable access control. [CITED: https://resend.com/docs/api-reference/emails/send-email] [VERIFIED: AGENTS.md]
- **Using `user_metadata` or email string alone for authorization:** Supabase docs identify user metadata as user-editable; same-email guest claiming needs token proof and signed-in same-email checks. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
- **Making a `SECURITY DEFINER` shortcut in `public`:** Supabase docs warn security-definer functions can bypass RLS and should not be created in exposed schemas. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
- **One collapsed order status:** Mixed orders need separate digital and physical progress to avoid implying shipped goods are delivered when only PDFs are ready. [VERIFIED: 05-CONTEXT.md]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Private PDF URL signing | Custom HMAC URL signer or permanent opaque URL table | Supabase Storage `createSignedUrl` after entitlement validation | Storage already implements fixed-duration signed URLs for object paths. [CITED: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl] |
| Email delivery transport | Raw SMTP client or custom HTTP retry-only sender | Resend SDK plus durable outbox | Official provider SDK handles API transport; app outbox owns durable retry/audit. [CITED: https://resend.com/docs/send-with-nextjs] |
| Recurring outbox scheduling | Browser-triggered retry loop | Supabase Cron or explicit admin/server job runner | Cron can run SQL/functions or HTTP jobs and records job runs in Postgres. [CITED: https://supabase.com/docs/guides/cron] |
| Access-control bypasses | Client-side PDF path checks or hidden buttons | RLS, owner filters, server actions, and service-role-only server code | Supabase service keys bypass RLS and must not be public; UI hiding is not authorization. [CITED: https://supabase.com/docs/guides/storage/security/access-control] |
| Payment-to-fulfillment coupling | Direct entitlement/email writes in PayPal/VietQR handlers | Post-paid fulfillment orchestration keyed by existing paid transition | Phase 4 locked `apply_payment_transition` as the single paid-state mutation boundary. [VERIFIED: STATE.md] |

**Key insight:** The hard part is not producing a download URL or an email; it is preserving exactly-once paid access, revocation, resend audit, and cross-user isolation across duplicate webhooks, expired links, guests, signed-in users, and mixed fulfillment states. [VERIFIED: 05-CONTEXT.md]

## Common Pitfalls

### Pitfall 1: Entitlements Created Twice
**What goes wrong:** Duplicate PayPal webhooks or repeated VietQR confirmation calls create duplicate entitlement/email rows. [VERIFIED: codebase grep]
**Why it happens:** Fulfillment is appended as side effects rather than keyed to paid order lines and idempotency keys. [VERIFIED: 05-CONTEXT.md]
**How to avoid:** Use unique constraints on `order_line_id` for entitlements and `purpose/entity_id/action_version` or explicit idempotency keys for outbox rows. [ASSUMED]
**Warning signs:** Tests pass for one payment event but fail under duplicate event replay. [VERIFIED: codebase grep]

### Pitfall 2: Signed URL Without Revalidation
**What goes wrong:** A stale email link still resolves after entitlement revocation or order claim. [VERIFIED: 05-CONTEXT.md]
**Why it happens:** The emailed link is the Storage signed URL itself rather than an app access route/token that revalidates entitlement before issuing a fresh Storage URL. [CITED: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl]
**How to avoid:** Email app tokens/routes, validate entitlement at click time, then issue a short Storage URL. [VERIFIED: 05-CONTEXT.md]
**Warning signs:** Tests can download after admin revoke or after guest access revocation. [VERIFIED: 05-CONTEXT.md]

### Pitfall 3: RLS Looks Correct But Queries Leak Through Views or Functions
**What goes wrong:** A view/function exposes rows across users despite table RLS. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
**Why it happens:** Views/functions can run with elevated privileges depending on definition and placement. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
**How to avoid:** Use `security_invoker = true` for exposed views, explicit owner filters, careful grants, and security-definer functions only with in-body checks and revokes/grants. [VERIFIED: codebase grep]
**Warning signs:** Security tests find `TO authenticated` without ownership predicates or unrestricted public RPC execution. [VERIFIED: codebase grep]

### Pitfall 4: Provider Idempotency Mistaken for Durable Outbox
**What goes wrong:** Resend avoids duplicate sends for 24 hours, but the app loses long-term retry/audit state. [CITED: https://resend.com/docs/dashboard/emails/idempotency-keys]
**Why it happens:** Provider idempotency keys are treated as the only dedupe mechanism. [CITED: https://resend.com/docs/dashboard/emails/idempotency-keys]
**How to avoid:** Store outbox rows, attempts, next retry, provider message ID, and sanitized failure details in Postgres. [VERIFIED: 05-CONTEXT.md]
**Warning signs:** Admin cannot see failed emails after process restart or after provider idempotency expiry. [VERIFIED: 05-CONTEXT.md]

### Pitfall 5: Guest Claim Leaves Old Access Alive
**What goes wrong:** Guest magic links continue to reopen an order after the order has been claimed into an account. [VERIFIED: 05-CONTEXT.md]
**Why it happens:** Claim only updates `owner_user_id` and does not revoke/reject outstanding guest tokens. [VERIFIED: 05-CONTEXT.md]
**How to avoid:** In the claim transaction, set owner, revoke guest reopen/download tokens, audit the claim, and require future access through signed-in account boundaries. [VERIFIED: 05-CONTEXT.md]
**Warning signs:** A guest token can access an order after account claim. [VERIFIED: 05-CONTEXT.md]

## Code Examples

### Customer Download Route Shape

```typescript
// Source: Supabase signed URL docs + existing server-only payment query pattern.
export async function GET(request: Request) {
  const input = downloadRequestSchema.parse(Object.fromEntries(new URL(request.url).searchParams));
  const authorization = await authorizeDownloadRequest(input);
  if (authorization.status !== 'authorized') {
    return new Response('Not found', {status: 404});
  }

  const {data, error} = await adminSupabase.storage
    .from('pattern-pdfs')
    .createSignedUrl(authorization.objectPath, 60 * 15);

  if (error || !data?.signedUrl) {
    return new Response('Unavailable', {status: 503});
  }

  return Response.redirect(data.signedUrl, 302);
}
```

### Outbox Claim/Send Shape

```typescript
// Source: Resend official docs and Phase 5 durable outbox decision.
const due = await claimDueEmailOutboxRows({limit: 25});
for (const email of due) {
  const rendered = renderTransactionalEmail(email);
  const {data, error} = await resend.emails.send(
    rendered,
    {idempotencyKey: `email-outbox/${email.id}`}
  );
  await recordEmailAttempt({
    outboxId: email.id,
    providerMessageId: data?.id ?? null,
    sanitizedError: error ? sanitizeEmailError(error) : null
  });
}
```

### RLS Owner Policy Shape

```sql
-- Source: Supabase RLS docs and existing checkout order-line owner policy pattern.
create policy "entitlements are owner readable"
on public.digital_entitlements
for select
to authenticated
using (
  owner_user_id = (select auth.uid())
  and status = 'active'
);
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Public object URLs for downloads | Private bucket plus signed URLs | Current Supabase Storage docs | Phase 5 must generate short-lived URLs only after entitlement checks. [CITED: https://supabase.com/docs/reference/javascript/storage-from-createsignedurl] |
| Views that silently bypass table RLS | `security_invoker = true` views for exposed data | Current Supabase/Postgres guidance | Customer/admin projections must preserve table policy semantics. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Email send as an inline side effect | Durable outbox plus provider idempotency | Locked Phase 5 decision | Provider failures do not corrupt paid transitions, and admins can inspect/retry failures. [VERIFIED: 05-CONTEXT.md] |
| Single fulfillment status | Separate digital and physical status | Phase 4 implementation | Mixed order UI can show PDFs ready while physical shipment is pending. [VERIFIED: codebase grep] |

**Deprecated/outdated:**
- Supabase `user_metadata` for authorization: Supabase docs identify it as user-editable and unsuitable for authorization. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
- Public PDF download URLs: project constraints and storage design require private PDFs with entitlement checks. [VERIFIED: AGENTS.md]
- Direct payment handler entitlement side effects: Phase 4 state says future provider paths must call `applyPaymentTransition` instead of directly mutating payment/order state. [VERIFIED: STATE.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Use unique constraints on `order_line_id` plus purpose/entity idempotency keys for entitlement/outbox dedupe. | Common Pitfalls | Planner may need a different uniqueness model if refunds/reissues require multiple active entitlement versions per line. |
| A2 | Supabase Cron is acceptable as the default outbox scheduler for this project. | Architecture Patterns | If production hosting disables or avoids Supabase Cron, planner must swap to a Vercel Cron route or manual admin job runner. |

## Open Questions

1. **Should outbox worker execution be Supabase Cron, Vercel Cron, or manual/admin-triggered for MVP?**
   - What we know: Supabase Cron can run SQL/functions or HTTP jobs and records run details. [CITED: https://supabase.com/docs/guides/cron]
   - What's unclear: Whether the deployment project has Supabase Cron enabled and approved for production operations. [ASSUMED]
   - Recommendation: Plan Supabase Cron as the standard path, with a server/admin manual `processDueEmailOutbox` action as fallback. [ASSUMED]

2. **Should email body rendering use plain HTML helpers or React components?**
   - What we know: Resend supports `html`, `text`, and Node SDK `react` content. [CITED: https://resend.com/docs/api-reference/emails/send-email]
   - What's unclear: The project has no existing email component convention. [VERIFIED: codebase grep]
   - Recommendation: Start with localized HTML/text helper functions to avoid extra packages; introduce React email components only if templates become complex. [ASSUMED]

3. **How should revoked/reissued entitlements model refunds?**
   - What we know: Phase 5 locks admin revoke/reissue audit but Phase 4 refund handling is not a full entitlement revocation system. [VERIFIED: 05-CONTEXT.md]
   - What's unclear: Whether partial refunds should automatically revoke matching digital entitlements in v1. [ASSUMED]
   - Recommendation: Implement manual admin revoke/reissue now and leave automatic refund-entitlement coupling as a later explicit requirement unless Phase 5 planning decides otherwise. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next.js, tests, scripts | yes | 20.19.4 | none needed. [VERIFIED: command] |
| npm | Install `resend`, run scripts | yes | 10.8.1 | none needed. [VERIFIED: command] |
| Supabase CLI | migrations, DB tests, type generation | yes | 2.106.0 | Use managed Supabase/MCP only if local CLI fails. [VERIFIED: command] |
| Supabase local services | DB reset/tests | not probed in research | — | Planner should include `npm run db:reset`/`npm run db:test` verification and handle service startup if needed. [ASSUMED] |
| Resend API key/domain | Sending transactional email | not configured in repo | — | Use mocked sender in tests; production requires `RESEND_API_KEY` and verified sender domain. [CITED: https://resend.com/docs/send-with-nextjs] |

**Missing dependencies with no fallback:**
- Production Resend API key and verified sending domain are required before real email delivery. [CITED: https://resend.com/docs/send-with-nextjs]

**Missing dependencies with fallback:**
- Supabase Cron production approval is not verified; fallback is admin/manual worker trigger or Vercel Cron route. [ASSUMED]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.8, Playwright 1.60.0, Supabase DB tests via `supabase test db`. [VERIFIED: package.json] |
| Config file | `vitest.config.ts`, `playwright.config.ts`, `supabase/config.toml`. [VERIFIED: rg --files] |
| Quick run command | `npm run test:unit` [VERIFIED: package.json] |
| Full suite command | `npm run lint && npm run typecheck && npm run test:unit && npm run db:reset && npm run db:lint && npm run db:test && npm run db:types && git diff --exit-code src/types/supabase.ts && npm run build && npm run test:security && npm run test:e2e` [VERIFIED: package.json] |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|--------------|
| DIG-02 | Paid order creates one entitlement per paid digital line, idempotently | DB + unit | `npm run db:test` and `npm run test:unit -- fulfillment` | no, Wave 0 |
| DIG-03 | Paid customer email outbox row contains expiring link token per purchased PDF | DB + unit | `npm run db:test` and `npm run test:unit -- fulfillment` | no, Wave 0 |
| DIG-04 | Download route validates entitlement before signed URL | unit + security + e2e | `npm run test:unit -- downloads` and `npm run test:security` | no, Wave 0 |
| DIG-05 | Signed-in pattern library shows only own purchases | unit + e2e | `npm run test:unit -- account` and `npm run test:e2e -- account` | no, Wave 0 |
| DIG-06 | Guest reopen token expires and cannot cross orders/emails | unit + e2e | `npm run test:unit -- guest` and `npm run test:e2e -- order-status` | partial existing guest cookie tests |
| DIG-07 | Admin resend/revoke/reissue creates audit rows and fresh tokens | DB + e2e | `npm run db:test` and `npm run test:e2e -- admin-orders` | partial admin order tests |
| FUL-01 | Mixed order digital ready while physical pending | DB + e2e | `npm run db:test` and `npm run test:e2e -- order-status` | partial Phase 4 DB tests |
| FUL-02 | Admin updates physical status/tracking | unit + e2e | `npm run test:unit -- fulfillment` and `npm run test:e2e -- admin-orders` | no, Wave 0 |
| FUL-03 | Shipping email and tracking visible | unit + e2e | `npm run test:unit -- email` and `npm run test:e2e -- order-status` | no, Wave 0 |
| ACC-02 | Signed-in customer sees own order/payments/downloads/tracking only | DB + e2e | `npm run db:test` and `npm run test:e2e -- auth` | partial auth/order tests |
| ACC-05 | Guest order claim same email plus token, revokes old guest tokens | DB + e2e | `npm run db:test` and `npm run test:e2e -- auth` | no, Wave 0 |
| OPS-01 | Email outbox retries transient failures safely | unit + DB | `npm run test:unit -- email-outbox` and `npm run db:test` | no, Wave 0 |
| OPS-02 | Admin failed email queue and controlled resend | unit + e2e | `npm run test:unit -- email-outbox` and `npm run test:e2e -- admin-orders` | no, Wave 0 |

### Sampling Rate

- **Per task commit:** `npm run test:unit` plus the nearest DB test when migration logic changes. [VERIFIED: package.json]
- **Per wave merge:** `npm run lint && npm run typecheck && npm run test:unit && npm run db:test && npm run test:security`. [VERIFIED: package.json]
- **Phase gate:** Full `npm run ci` equivalent green before `$gsd-verify-work`, plus manual Resend/Supabase Cron/provider checks if real email delivery is enabled. [VERIFIED: package.json]

### Wave 0 Gaps

- [ ] `supabase/tests/database/05_fulfillment_entitlements.test.sql` — covers DIG-02, DIG-04, FUL-01, ACC-02.
- [ ] `supabase/tests/database/05_email_outbox.test.sql` — covers DIG-03, DIG-07, OPS-01, OPS-02.
- [ ] `supabase/tests/database/05_guest_claim.test.sql` — covers DIG-06, ACC-05.
- [ ] `tests/unit/fulfillment/downloads.test.ts` — covers token validation and signed URL adapter behavior.
- [ ] `tests/unit/fulfillment/email-outbox.test.ts` — covers retry/backoff/idempotency and sanitized errors.
- [ ] `tests/unit/fulfillment/physical.test.ts` — covers manual status flow and shipping notification enqueue.
- [ ] `tests/e2e/order-downloads.spec.ts` — covers signed-in/guest download and expired-link regeneration.
- [ ] `tests/e2e/admin-fulfillment.spec.ts` — covers failed email queue, resend, revoke/reissue, and physical tracking updates.
- [ ] `tests/security/fulfillment-boundaries.test.mjs` — blocks public PDF URL exposure, service-role browser imports, raw tokens in URLs/logs, and cross-user access helpers.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|------------------|
| V2 Authentication | yes | Supabase Auth for signed-in accounts; email magic tokens for guests must be hashed, expiring, scoped, and single-purpose. [VERIFIED: 05-CONTEXT.md] |
| V3 Session Management | yes | SSR cookie Supabase clients for accounts; revoke guest tokens on claim; avoid durable raw tokens in client storage. [VERIFIED: codebase grep] |
| V4 Access Control | yes | RLS owner/admin policies, server actions, `requireAdmin`, and entitlement checks before signed URLs. [VERIFIED: codebase grep] |
| V5 Input Validation | yes | Zod for route/action payloads plus SQL constraints for states/tokens/statuses. [VERIFIED: package.json] |
| V6 Cryptography | yes | Use Node crypto/random bytes and SHA-256 hashing patterns already used for guest access; do not invent reversible tokens. [VERIFIED: codebase grep] |
| V7 Error Handling and Logging | yes | Sanitize provider/email errors before admin display and never log tokens, service keys, raw provider payloads, or PDF object secrets. [VERIFIED: STATE.md] |
| V10 Malicious Code | yes | Package legitimacy gate flags `resend` as `SUS`; planner must add a human-verify checkpoint before install. [VERIFIED: package-legitimacy seam] |

### Known Threat Patterns for Next.js + Supabase Fulfillment

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR across orders/downloads | Elevation of Privilege | Owner-scoped RLS, explicit `.eq` owner/order filters, non-enumerating 404s, and entitlement checks. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Public or durable PDF URL leakage | Information Disclosure | Private bucket, app token route, short Storage signed URL only after entitlement validation. [CITED: https://supabase.com/docs/guides/storage/security/access-control] |
| Guest token replay after claim | Spoofing | Hash tokens, store expiry/status, revoke on claim, require signed-in same-email plus email token proof. [VERIFIED: 05-CONTEXT.md] |
| Duplicate email/entitlement side effects | Tampering | Unique constraints, outbox idempotency keys, Resend idempotency, and duplicate event tests. [CITED: https://resend.com/docs/dashboard/emails/idempotency-keys] |
| Admin action abuse | Elevation of Privilege | `requireAdmin`, private helper checks, audit events, and carefully revoked/granted RPCs. [VERIFIED: codebase grep] |
| RLS bypass through views/functions | Elevation of Privilege | `security_invoker = true` views and avoid security-definer functions in exposed schemas. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |

## Sources

### Primary (HIGH confidence)
- Local codebase grep/codegraph: Phase 4 migrations, payment queries, order/admin UI, guest access helper, tests, and package pins. [VERIFIED: codebase grep]
- `AGENTS.md`, `.planning/REQUIREMENTS.md`, `.planning/STATE.md`, and `05-CONTEXT.md`: project constraints, locked Phase 5 decisions, and requirement map. [VERIFIED: local files]
- npm registry: `resend` version/package metadata and package-legitimacy seam output. [VERIFIED: npm registry]

### Secondary (MEDIUM confidence)
- https://supabase.com/docs/reference/javascript/storage-from-createsignedurl — signed URL semantics and `expiresIn`. [CITED: docs]
- https://supabase.com/docs/guides/storage/security/access-control — Storage RLS, service key bypass warning, private bucket policy model. [CITED: docs]
- https://supabase.com/docs/guides/database/postgres/row-level-security — RLS, `auth.jwt()`, `user_metadata`, filters, security-definer cautions. [CITED: docs]
- https://supabase.com/docs/guides/cron — Supabase Cron scheduling model and limits. [CITED: docs]
- https://resend.com/docs/send-with-nextjs — Next.js SDK setup and prerequisites. [CITED: docs]
- https://resend.com/docs/api-reference/emails/send-email — send email parameters and idempotency header. [CITED: docs]
- https://resend.com/docs/dashboard/emails/idempotency-keys — 24-hour provider idempotency behavior. [CITED: docs]

### Tertiary (LOW confidence)
- Assumptions in the Assumptions Log only; no unverified package recommendations are made. [ASSUMED]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — package versions and project stack are verified locally; `resend` is official-doc cited and npm-verified but has a `SUS` package-legitimacy flag due recent latest publish.
- Architecture: MEDIUM — project code and official docs strongly support the shape, but scheduler choice and exact entitlement schema need planning decisions.
- Pitfalls: MEDIUM — most pitfalls are grounded in locked decisions, Supabase docs, and Phase 4 patterns; specific uniqueness/backoff thresholds remain assumptions.

**Research date:** 2026-06-19
**Valid until:** 2026-07-19 for local architecture and 2026-06-26 for external package/docs versions.
