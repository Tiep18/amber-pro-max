# Phase 1: Secure Bilingual Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md - this log preserves the alternatives considered.

**Date:** 2026-06-12
**Phase:** 1-Secure Bilingual Foundation
**Areas discussed:** Language routing

---

## Language Routing

### Initial Language

| Option | Description | Selected |
|--------|-------------|----------|
| Detect browser language | Use Vietnamese when the browser prefers Vietnamese; otherwise use English. | Yes |
| Always default to Vietnamese | Make Vietnamese the first experience for every new visitor. | |
| Always default to English | Make English the first experience for every new visitor. | |
| Detect by IP location | Choose Vietnamese in Vietnam and English elsewhere. | |

**User's choice:** Detect browser language.
**Notes:** No additional qualification was requested.

### URL Prefixes

| Option | Description | Selected |
|--------|-------------|----------|
| Prefix every URL | Use explicit `/vi` and `/en` prefixes consistently. | Yes |
| Vietnamese unprefixed | Use unprefixed Vietnamese routes and `/en` for English. | |
| English unprefixed | Use unprefixed English routes and `/vi` for Vietnamese. | |

**User's choice:** Prefix every URL.
**Notes:** Both languages have equal, explicit URL structure.

### Language Switching

| Option | Description | Selected |
|--------|-------------|----------|
| Keep equivalent page | Navigate to the translated equivalent of the current page. | Yes |
| Return home | Always navigate to the selected language's home page. | |
| Conditional fallback | Keep the page when translated, otherwise return home. | |

**User's choice:** Keep the equivalent page.
**Notes:** Navigation context should survive a language change.

### Localized Slugs

| Option | Description | Selected |
|--------|-------------|----------|
| Translate each slug | Use natural Vietnamese and English slugs. | Yes |
| Share English slugs | Use the same English slug under both locale prefixes. | |
| Share fixed identifiers | Use language-independent route identifiers. | |

**User's choice:** Translate each slug.
**Notes:** Public URLs should be natural for readers and localized SEO.

## Agent's Discretion

- Customer authentication journey details.
- Admin access and first-admin provisioning details.
- Foundation visual system and responsive navigation.
- Translation fallback, locale persistence, and legacy redirect details within the locked routing decisions.

## Deferred Ideas

None.
