# Pitfalls Research

**Domain:** Bilingual ecommerce for digital patterns and handmade physical goods
**Researched:** 2026-06-12
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Releasing PDFs From an Untrusted Payment Signal

**What goes wrong:**
PDFs are emailed after a browser redirect, client callback, screenshot, or unverified webhook even though payment was not completed or belongs to another order.

**Why it happens:**
Happy-path checkout demos treat "customer returned from payment" as proof of settlement.

**How to avoid:**
Use a server-owned payment state machine. Verify PayPal webhook signatures from the raw request, validate event/order/amount/currency/merchant, deduplicate events, and permit only one idempotent transition to paid. VietQR requires an audited admin confirmation.

**Warning signs:**
Download email code is called from a success page; webhook code does not store event IDs; order totals are accepted from the browser.

**Phase to address:**
Payment and order lifecycle phase.

---

### Pitfall 2: Public or Durable PDF URLs

**What goes wrong:**
A customer shares one permanent link and anyone can download the paid pattern indefinitely.

**Why it happens:**
The storage URL is treated as the customer's purchase right.

**How to avoid:**
Keep PDFs in private storage. Store durable entitlements in the database, validate ownership or a scoped guest token for each download request, then create a short-lived signed URL.

**Warning signs:**
PDF URLs are stored directly in order email; bucket is public; signed URL expiry is measured in days; there is no entitlement table.

**Phase to address:**
Digital fulfillment and access-control phase.

---

### Pitfall 3: Overselling Limited Handmade Inventory

**What goes wrong:**
Two buyers purchase the same final unit, or stock remains blocked forever by unpaid VietQR orders.

**Why it happens:**
Inventory is checked and decremented in separate non-atomic requests, and pending payment has no reservation expiry policy.

**How to avoid:**
Create reservations atomically in Postgres, define reservation expiry per payment method, finalize once on paid, and release expired/cancelled reservations through a scheduled job.

**Warning signs:**
Code follows `SELECT stock` then `UPDATE stock`; no reservation table; manual payment orders hold stock without an expiration timestamp.

**Phase to address:**
Catalog, inventory, and checkout foundation phase.

---

### Pitfall 4: Market Price or Availability Leaks

**What goes wrong:**
Vietnam prices are cached and shown internationally, restricted products enter checkout, or changing the shipping country silently changes totals.

**Why it happens:**
IP-derived market is treated as final and cache keys ignore locale/market.

**How to avoid:**
Model explicit market offers, include market in cache/query context, use IP only as a suggestion, revalidate physical eligibility using destination, and require customer acknowledgement before recalculated payment.

**Warning signs:**
A single `price` column; one globally cached product response; no final market snapshot on the order.

**Phase to address:**
Market-aware catalog and pricing phase.

---

### Pitfall 5: Mixed Order State Collapse

**What goes wrong:**
An order is marked complete after the PDF email even though physical goods are unshipped, or PDF delivery waits unnecessarily for physical shipment.

**Why it happens:**
One order `status` is used for payment and every fulfillment type.

**How to avoid:**
Separate payment, digital fulfillment, and physical fulfillment states. Create digital entitlements after full payment; physical lines continue through preparation and tracking independently.

**Warning signs:**
Only one status column; no line fulfillment type; "complete order" triggers every side effect.

**Phase to address:**
Order lifecycle and fulfillment phase.

---

### Pitfall 6: RLS That Looks Secure but Is Not

**What goes wrong:**
Customers see other orders/downloads, admin checks trust editable metadata, or a view bypasses policies.

**Why it happens:**
RLS is added late, service keys leak into client code, or policies copy the same `auth.uid()` expression without matching guest and admin access models.

**How to avoid:**
Enable RLS on every exposed table from the first migration. Keep service/secret keys server-only. Store roles in server-controlled app metadata or a protected role table. Make exposed views `security_invoker` and test policies as anon, customer A, customer B, and admin.

**Warning signs:**
`service_role` or secret key appears in `NEXT_PUBLIC_*`; authorization uses `user_metadata`; tests only use admin credentials.

**Phase to address:**
Foundation/Auth phase and every schema phase.

---

### Pitfall 7: Email as a Non-Durable Side Effect

**What goes wrong:**
Payment succeeds but order/download email is never sent, or retries send duplicates.

**Why it happens:**
Email is sent inline without storing intent, provider response, or retry state.

**How to avoid:**
Use a transactional outbox, deterministic template/event keys, retry policy, provider message ID, and admin resend operation. The account download library remains a fallback.

**Warning signs:**
`sendEmail()` runs directly after payment update; no email event table; failures only appear in application logs.

**Phase to address:**
Fulfillment and communications phase.

---

### Pitfall 8: International Tax, Consumer, Privacy, and Product Rules Assumed Away

**What goes wrong:**
The store launches without a defensible policy for taxes on digital/physical sales, returns, privacy, newsletter consent, or destination restrictions.

**Why it happens:**
Payment processing is mistaken for tax/compliance handling, and "international" is modeled as one unrestricted region.

**How to avoid:**
Treat legal/tax policy as a launch gate. Configure sellable countries explicitly, capture consent evidence, publish localized policies, and obtain professional advice for the actual seller entity and destinations. Do not assume PayPal calculates or remits all obligations.

**Warning signs:**
Every country is enabled by default; no refund/download policy; no consent timestamps; no tax decision recorded.

**Phase to address:**
Checkout policy and launch-readiness phase.

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| One product price column | Fast catalog setup | Cannot represent Vietnam/international strategy or historical totals. | Never for this project. |
| Product JSON blob for variants | Flexible initial schema | Weak constraints, difficult stock and price queries. | Only for non-authoritative display metadata. |
| Manual email after manual payment | No email integration | Slow fulfillment, mistakes, no audit trail. | Temporary admin fallback only. |
| Service-role queries for all requests | Bypasses policy friction | One bug exposes all customer/order data. | Only narrow server-only operations that truly require privilege. |
| No inventory reservation | Simple stock counter | Overselling or blocked inventory. | Never once checkout is public. |

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| PayPal | Trusting `onApprove` alone or processing duplicate webhooks twice | Capture/reconcile server-side, verify webhook signature, store event ID, validate amount/currency/order. |
| PayPal | Re-stringifying JSON before webhook verification | Preserve and verify the original raw request body. |
| Supabase Auth | Using user-editable metadata for admin role | Use protected app metadata or a role table and server/RLS checks. |
| Supabase Storage | Giving customers the stored object URL | Private bucket, entitlement endpoint, short-lived signed URL. |
| Vercel geo | Treating country header as authoritative | Suggest market only; destination validates physical eligibility. |
| Resend/email | Assuming a successful API call equals customer receipt | Store provider ID/status, retry transient failures, expose account fallback. |
| VietQR/manual transfer | Treating uploaded proof as payment | Admin verifies bank receipt and confirms exact amount/reference. |

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Loading full admin tables | Slow order/product screens | Indexed filters and keyset pagination | Hundreds to low thousands of rows. |
| Per-card database queries | Slow category pages | Batch relational queries or read models | Dozens of products per page. |
| Unoptimized original images | Poor mobile Core Web Vitals | Responsive images, dimensions, compression, CDN | Immediately on image-heavy pages. |
| Rebuilding every localized page on each edit | Slow content publishing | Tagged/on-demand revalidation | Catalog/blog growth. |
| RLS predicates without indexes | Increasing account/admin latency | Index policy columns such as `user_id`, `order_id`, status | Thousands of protected rows. |

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Client-submitted totals | Underpayment and coupon abuse | Server recalculation and immutable order snapshot. |
| Guessable guest order/download tokens | Unauthorized order and PDF access | High-entropy hashed tokens, expiry, rotation, rate limits. |
| Service/secret key in browser | Full data/storage compromise | Server-only environment variables and import boundaries. |
| Missing webhook idempotency | Duplicate fulfillment/refunds/state corruption | Unique provider event ID and transition guards. |
| Unrestricted admin mutation endpoints | Inventory, payment, and customer-data compromise | Server authorization, RLS, CSRF-aware patterns, audit log. |
| Logging personal/payment data | Privacy and incident exposure | Structured redaction; never log secrets, full addresses, or raw sensitive payloads unnecessarily. |

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Market changes silently | Buyer loses trust when price changes at checkout. | Show detected market and require acknowledgement when destination causes recalculation. |
| Digital/physical distinction is unclear | Buyer expects a finished item but purchases a pattern, or vice versa. | Prominent product-type badge and repeated checkout labeling. |
| Pending VietQR has no instructions | Buyer does not know amount, reference, deadline, or fulfillment timing. | Clear QR, bank details, unique reference, expiry, and status page. |
| Exception request feels like a completed order | Customer expects stock or shipping commitment. | Label it as a non-binding request with admin response workflow. |
| Guest buyers cannot recover access | Lost email means lost purchase. | Secure order-access flow and optional account claiming after email verification. |

## "Looks Done But Isn't" Checklist

- [ ] **PayPal:** Sandbox success is not enough; verify duplicate, delayed, invalid-signature, wrong-amount, cancellation, and refund paths.
- [ ] **VietQR:** Verify pending expiry, exact-reference admin confirmation, wrong amount, cancellation, and stock release.
- [ ] **PDF delivery:** Verify private bucket, entitlement ownership, expired URL regeneration, guest access, account re-download, and revocation.
- [ ] **Inventory:** Verify concurrent final-unit checkout and reservation expiry.
- [ ] **Localization:** Verify localized URLs, canonical/hreflang, translated metadata, emails, currency formatting, and missing-translation fallback.
- [ ] **RLS:** Test anonymous, customer A, customer B, and admin access for every sensitive table/view/storage path.
- [ ] **Mixed order:** Verify digital delivery after full payment while physical fulfillment remains open.
- [ ] **SEO:** Validate Product and Article structured data with production-like content.

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| PDF link leak | MEDIUM | Revoke/replace asset path, invalidate access tokens, audit downloads, reissue entitlements. |
| Duplicate fulfillment | MEDIUM | Freeze event processing, reconcile unique provider events and state transitions, add idempotency before replay. |
| Oversold inventory | HIGH | Contact affected buyers, refund or negotiate lead time, reconcile reservations, deploy atomic stock logic. |
| Wrong market price cached | MEDIUM | Purge caches, identify affected orders, honor or remediate prices, add market cache keys and tests. |
| Missing paid-order email | LOW | Replay durable outbox/admin resend; account library supplies immediate fallback. |

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Market leaks | Market-aware catalog | Market/locale cache and destination-change tests. |
| Overselling | Inventory and checkout | Concurrent final-unit and expiry tests. |
| RLS failures | Foundation/Auth | Cross-user policy and storage tests. |
| Payment-triggered PDF leak | Payments | Invalid/duplicate/wrong-amount webhook tests. |
| Durable PDF access | Digital fulfillment | Entitlement and signed-link lifecycle tests. |
| Mixed status collapse | Orders/Fulfillment | Independent digital/physical state tests. |
| Missing emails | Communications | Outbox failure/retry/idempotency tests. |
| Compliance assumptions | Launch readiness | Recorded country, tax, policy, consent, and refund decisions. |

## Sources

- https://developer.paypal.com/api/rest/webhooks/rest/ - webhook HTTPS behavior, retries, raw-body signature verification.
- https://developer.paypal.com/docs/checkout/standard/customize/handle-funding-failures/ - payment failure handling.
- https://supabase.com/docs/guides/database/postgres/row-level-security - RLS, role metadata, views, and service-key cautions.
- https://supabase.com/docs/guides/auth/server-side/creating-a-client - SSR auth and current key guidance.
- https://supabase.com/docs/reference/javascript/storage-from-createsignedurl - signed URL behavior.
- https://vercel.com/docs/headers/request-headers#x-vercel-ip-country - IP-country header semantics.
- https://developers.google.com/search/docs/specialty/international/localized-versions - localized URL and search guidance.

---
*Pitfalls research for: bilingual mixed digital/physical ecommerce*
*Researched: 2026-06-12*
