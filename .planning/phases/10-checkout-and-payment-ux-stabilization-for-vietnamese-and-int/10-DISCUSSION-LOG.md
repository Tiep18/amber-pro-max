# Phase 10: Checkout and payment UX stabilization for Vietnamese and international customers - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-04
**Phase:** 10-checkout-and-payment-ux-stabilization-for-vietnamese-and-int
**Areas discussed:** Vietnamese address model, saved-address consent, support destination, plan granularity

---

## Vietnamese address model

| Option | Description | Selected |
|--------|-------------|----------|
| Current two-level model | Province/City → Ward/Commune/Special zone; legacy district optional | ✓ |
| Legacy three-level model | Province → District → Ward as required fields | |

**User's choice:** Current two-level model (`1a`).
**Notes:** Runtime data must be versioned and repository-owned rather than dependent on a third-party API.

---

## Saved-address consent

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit opt-in | Checkbox is unchecked by default | ✓ |
| Default opt-in | Checkbox starts checked | |
| Defer saving | Do not add save-address behavior in this phase | |

**User's choice:** Explicit opt-in (`2a`).
**Notes:** Guest checkout remains account-free.

---

## Support destination

| Option | Description | Selected |
|--------|-------------|----------|
| Localized contact surface | `/contact` reads centralized email/Zalo configuration and hides absent channels | ✓ |
| Direct mailto | Hard-link one supplied email address | |
| Defer support CTA | Leave support links out of Phase 10 | |

**User's choice:** Localized contact surface (`3a`).
**Notes:** Do not invent placeholder contact details.

---

## Plan granularity

| Option | Description | Selected |
|--------|-------------|----------|
| Seven plans | Cart/PDP; address/draft; checkout/mobile/copy; submit/error; payment/recovery; VietQR/success; regression/UAT | ✓ |
| Six plans | Fold cart into checkout and verification into the final feature plan | |
| Eight plans | Separate Vietnamese address and i18n into their own plans | |

**User's choice:** Seven plans (`4a`).
**Notes:** Seven is a hard planning constraint, not a target range.

## the agent's Discretion

- Exact component boundaries, address snapshot module design, safe session draft TTL, and wave dependencies.
- Exact visual treatment provided the state hierarchy, accessibility, bilingual copy, and one-primary-action rules are preserved.

## Deferred Ideas

- Same-order terminal payment retry, new payment providers, carrier ETA/rates, receipt uploads, and analytics.
- Phase 09 Vercel geo/external SEO verification remains a separate pending UAT item.
