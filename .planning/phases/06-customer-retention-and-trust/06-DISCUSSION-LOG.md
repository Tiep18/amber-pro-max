# Phase 6: Customer Retention and Trust - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-20
**Phase:** 6-Customer Retention and Trust
**Areas discussed:** Saved addresses in checkout, Wishlist behavior, Verified reviews and moderation, Newsletter consent and unsubscribe

---

## Saved Addresses in Checkout

### Checkout Usage

| Option | Description | Selected |
|--------|-------------|----------|
| Choose then copy into form | Customer chooses a saved address to fill checkout, while the order stores an immutable snapshot. | Yes |
| Auto-apply the default address | Faster repeat purchase, but easier to surprise customers shipping elsewhere. | |
| Manage only in account, not checkout | Lower integration risk, but less useful for Phase 6. | |
| Other | Freeform alternative. | |

**User's choice:** Choose then copy into form.
**Notes:** Saved address edits must not mutate prior order shipping snapshots.

### Default Address

| Option | Description | Selected |
|--------|-------------|----------|
| One default shipping address | Simple v1 repeat-purchase behavior. | Yes |
| Default by market/country | Useful for multi-country customers, but heavier than MVP needs. | |
| No default, manual list only | Clear but less convenient. | |
| Other | Freeform alternative. | |

**User's choice:** One default shipping address.
**Notes:** Keep v1 default behavior simple.

### Market and Quote Revalidation

| Option | Description | Selected |
|--------|-------------|----------|
| Copy and revalidate quote immediately | Fill the form, then recalculate market, price, shipping, currency, and eligibility. | Yes |
| Block addresses that do not match the current market | Safe but too rigid for Phase 3 market revalidation behavior. | |
| Copy with a warning only | Smooth but risks stale checkout state. | |
| Other | Freeform alternative. | |

**User's choice:** Copy and revalidate quote immediately.
**Notes:** Material changes must use the existing Phase 3 confirmation preview.

### Edit and Delete

| Option | Description | Selected |
|--------|-------------|----------|
| Allow edit/delete freely without affecting old orders | Saved addresses are future checkout convenience data; old orders keep snapshots. | Yes |
| Do not allow deletion if ever used in an order | Unneeded because order evidence is already snapshotted. | |
| Archive instead of hard delete | More audit data, but extra PII retention for MVP. | |
| Other | Freeform alternative. | |

**User's choice:** Allow edit/delete freely without affecting old orders.
**Notes:** Prior orders remain immutable.

---

## Wishlist Behavior

### Storage Level

| Option | Description | Selected |
|--------|-------------|----------|
| Product-level only | Store product intent and reload current catalog facts at render time. | Yes |
| Product plus selected variant | Useful for variant-heavy products, but can stale more easily. | |
| Product-level with optional variant | Flexible but more schema/UI complexity. | |
| Other | Freeform alternative. | |

**User's choice:** Product-level only.
**Notes:** Do not store commercial snapshots in wishlist entries.

### Unavailable Products

| Option | Description | Selected |
|--------|-------------|----------|
| Allow saving and show unavailable status | Wishlist captures long-term interest while blocking checkout until eligible. | Yes |
| Only allow saving available products | Simpler but loses demand signal. | |
| Allow saving but auto-hide unavailable products | Risks making customers think items disappeared. | |
| Other | Freeform alternative. | |

**User's choice:** Allow saving and show unavailable status.
**Notes:** Market switch or exception request may be offered where appropriate.

### UI Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Account page plus product card/detail hearts | Manage in account and act quickly while browsing. | Yes |
| Account page only | Less UI, but harder to save while browsing. | |
| Product detail only | Avoids catalog grid controls, but lowers discoverability. | |
| Other | Freeform alternative. | |

**User's choice:** Account page plus product card/detail hearts.
**Notes:** Use heart/add-remove controls on product cards and product details.

### Guest Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Require sign-in and return to the product | Keeps wishlist account-owned and simple for v1. | Yes |
| Store a guest wishlist and merge after sign-in | Smoother but adds cart-like merge logic. | |
| Hide or disable hearts for guests | Simple, but loses a sign-in conversion path. | |
| Other | Freeform alternative. | |

**User's choice:** Require sign-in and return to the product.
**Notes:** No guest wishlist merge in Phase 6.

---

## Verified Reviews and Moderation

### Review Cardinality

| Option | Description | Selected |
|--------|-------------|----------|
| One review per customer per product | Reduces spam and lets later purchases update the same public review. | Yes |
| One review per paid order line | Strong proof link, but duplicate-prone. | |
| One review per order grouped by product | Harder to reason about for multi-product orders. | |
| Other | Freeform alternative. | |

**User's choice:** One review per customer per product.
**Notes:** Later purchases do not create duplicate public reviews.

### Review Edits

| Option | Description | Selected |
|--------|-------------|----------|
| Allow edits and return to pending moderation | Lets customers update experience without bypassing moderation. | Yes |
| Allow edits to publish immediately after prior approval | Smooth but bypasses moderation. | |
| Do not allow edits; only delete or request admin help | Safe but rigid. | |
| Other | Freeform alternative. | |

**User's choice:** Allow edits and return to pending moderation.
**Notes:** Updated content is not public until approved.

### Public Identity

| Option | Description | Selected |
|--------|-------------|----------|
| Shortened display name or masked identity plus verified purchase badge | Balances trust and privacy. | Yes |
| Anonymous except verified purchase badge | More private but less social proof. | |
| Customer-chosen display name | Flexible but requires extra validation/moderation. | |
| Other | Freeform alternative. | |

**User's choice:** Shortened display name or masked identity plus verified purchase badge.
**Notes:** Full email must never be public.

### Admin Replies

| Option | Description | Selected |
|--------|-------------|----------|
| One public admin reply per review, editable/removable | Meets response requirement without creating threads. | Yes |
| Multiple admin replies as a conversation thread | Too close to comments/support conversations for Phase 6. | |
| Approve/hide only, no replies in v1 | Simpler but misses the admin response requirement. | |
| Other | Freeform alternative. | |

**User's choice:** One public admin reply per review, editable/removable.
**Notes:** No threaded review conversations.

---

## Newsletter Consent and Unsubscribe

### Subscription Identity

| Option | Description | Selected |
|--------|-------------|----------|
| Email as primary identifier with latest locale/market preference | Works for visitors and signed-in customers while preserving current preference. | Yes |
| User account only | Excludes visitors, which conflicts with the requirement. | |
| Separate subscription by email and locale | Flexible but can create conflicting states for one email. | |
| Other | Freeform alternative. | |

**User's choice:** Email as primary identifier with latest locale/market preference.
**Notes:** Keep consent history.

### Unsubscribe Flow

| Option | Description | Selected |
|--------|-------------|----------|
| One-click unsubscribe token with localized result page | Standard visitor-friendly unsubscribe behavior. | Yes |
| Confirmation page requiring one more click | Reduces accidental clicks but adds friction. | |
| Signed-in unsubscribe only | Conflicts with visitor/guest subscription. | |
| Other | Freeform alternative. | |

**User's choice:** One-click unsubscribe token with localized result page.
**Notes:** Do not require sign-in.

### Admin Subscriber View

| Option | Description | Selected |
|--------|-------------|----------|
| View/search/filter status and consent history only | Lets admin inspect status without overriding consent. | Yes |
| Allow admin unsubscribe but not subscribe | Useful for support, but can still override consent. | |
| Allow admin subscribe and unsubscribe | Consent risk, not for MVP. | |
| Other | Freeform alternative. | |

**User's choice:** View/search/filter status and consent history only.
**Notes:** Admin cannot manually subscribe or unsubscribe customers in v1.

### Consent Evidence

| Option | Description | Selected |
|--------|-------------|----------|
| Email, locale, market, source, timestamp, hashed/redacted metadata, unsubscribe token metadata | Enough audit evidence without raw PII-heavy logs. | Yes |
| Only email and subscribed/unsubscribed timestamp | Too weak for source/language evidence. | |
| Full IP, full user-agent, referrer, and campaign metadata | More data than MVP needs and increases PII exposure. | |
| Other | Freeform alternative. | |

**User's choice:** Email, locale, market, source, timestamp, hashed/redacted metadata, unsubscribe token metadata.
**Notes:** Avoid unnecessary personal data.

---

## the agent's Discretion

- Exact schema, route, action, and enum names.
- Exact bilingual copy, empty states, and compact admin layouts.
- Exact rating scale, unavailable wishlist CTA wording, address labels, and subscriber filter set, provided they do not add new Phase 7 capabilities.

## Deferred Ideas

None - discussion stayed within phase scope.
