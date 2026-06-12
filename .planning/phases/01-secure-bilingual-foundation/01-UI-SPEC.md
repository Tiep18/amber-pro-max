---
phase: 01
slug: secure-bilingual-foundation
status: approved
reviewed_at: 2026-06-12
shadcn_initialized: false
preset: pending-phase-1-scaffold
created: 2026-06-12
---

# Phase 01 - UI Design Contract

> Visual and interaction source of truth for the Secure Bilingual Foundation. It covers localized public, authentication, account, and admin shells only. Catalog, checkout, payments, orders, and fulfillment are out of scope.

---

## Design Direction

The interface must feel warm, careful, and trustworthy: a modern handmade studio rather than a generic marketplace or playful craft blog. Use quiet cream surfaces, restrained terracotta accents, generous whitespace, clear security feedback, and subtle textile-inspired details only where they do not compete with content.

Brand identity is provisional. Use a text wordmark placeholder and semantic tokens so the final name, logo, and palette can be replaced without restructuring components.

### Design Principles

1. **Warm clarity:** handmade character comes from color, typography, imagery space, and rounded shapes, not decorative clutter.
2. **Trust before delight:** auth, account, and admin states prioritize explicit status, predictable actions, and readable errors.
3. **Bilingual parity:** Vietnamese and English receive equal hierarchy, complete copy, equivalent routes, and layouts tolerant of text expansion.
4. **Visible boundaries:** public, customer account, and admin areas must look related but unmistakably different.
5. **Mobile completeness:** all Phase 1 journeys must work at 320px without hidden required actions or horizontal scrolling.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn/ui planned; initialize during Phase 1 scaffold |
| Preset | Select a neutral Radix-based preset during scaffold, then map it to the tokens below |
| Component library | shadcn/ui with Radix primitives |
| Styling | Tailwind CSS 4 semantic theme tokens |
| Icon library | Lucide React, 1.5-2px stroke |
| Sans font | Be Vietnam Pro, variable, Vietnamese and English subsets |
| Decorative font | None in Phase 1 |
| Radius | 8px controls, 12px cards, 16px feature surfaces |
| Elevation | Borders by default; one soft shadow level for floating menus/dialogs |

Do not install third-party shadcn registries or blocks. Official shadcn components may be generated during execution and adapted to this contract. Preserve accessible Radix behavior when styling.

---

## Spacing Scale

Declared values:

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Icon-to-label gaps, validation detail |
| `sm` | 8px | Compact control contents, related inline items |
| `md` | 16px | Default component padding and form gaps |
| `lg` | 24px | Card padding, mobile page gutters |
| `xl` | 32px | Shell sections and desktop form spacing |
| `2xl` | 48px | Major section breaks |
| `3xl` | 64px | Desktop page-level vertical spacing |

Exceptions:

- Interactive targets must be at least 44x44px even when visual content is smaller.
- Desktop content gutters may be 40px at 1024-1279px and 48px at 1280px or wider.
- One-pixel borders and two-pixel focus rings are permitted structural values, not spacing tokens.
- Auth form controls use a 48px minimum height.

---

## Typography

Use exactly four sizes and two weights. `Be Vietnam Pro` must be self-hosted through `next/font` or an equivalent build-time path, never loaded from a runtime third-party stylesheet.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Label / Meta | 14px | 600 | 1.4 |
| Body / Control | 16px | 400 | 1.5 |
| Section Heading | 20px | 600 | 1.3 |
| Page Heading / Display | 28px | 600 | 1.2 |

Rules:

- Use sentence case for headings, buttons, navigation, and form labels.
- Do not use uppercase for full labels; uppercase is allowed only for short technical environment badges.
- Limit public reading width to 68 characters; auth explanatory copy to 52 characters.
- Never reduce Vietnamese text size to force parity with English. Allow wrapping and flexible component height.
- Use tabular numerals for timestamps, IDs, and future commerce data.

---

## Color

All values are light-theme defaults. Implement as semantic CSS variables, not direct utility colors in components.

| Role | Token / Value | Usage |
|------|---------------|-------|
| Dominant (60%) | `--background: #FFF9F2` | Public page background and large quiet surfaces |
| Secondary (30%) | `--surface: #FFFFFF`; `--surface-muted: #F5EDE3` | Cards, auth panel, account shell, admin navigation |
| Accent (10%) | `--accent: #A6472D`; hover `#843823` | Primary CTA, active navigation indicator, selected language, focus ring, approved inline links |
| Text | `--foreground: #2E2926`; muted `#6F655E` | Primary and secondary content |
| Border | `--border: #DCCFC2` | Inputs, cards, dividers, shell boundaries |
| Success | `--success: #2F6B4F`; surface `#E9F4ED` | Verified email, password updated, signed-out confirmation |
| Warning | `--warning: #8A5A16`; surface `#FFF4D6` | Session notice, pending email verification |
| Destructive | `--destructive: #B42318`; surface `#FDECEC` | Invalid input, denied action, destructive actions only |
| Admin shell | `--admin-nav: #292623`; text `#FFF9F2` | Persistent admin navigation and role distinction |

Accent is reserved for:

- The single primary action in a view.
- Current navigation or language selection.
- Keyboard focus rings.
- Inline links that perform navigation.
- Small brand marks and status emphasis where no semantic status color applies.

Do not use accent as a large page background, decorative gradient, every icon color, or secondary button fill. Text and controls must meet WCAG 2.2 AA contrast; normal text requires at least 4.5:1 and large text 3:1.

---

## Shell Contracts

### Public Shell

- Header height: 64px mobile, 72px desktop.
- Content max width: 1200px, centered.
- Mobile gutters: 16px at 320-479px, 24px from 480px.
- Desktop header contains text wordmark left; primary navigation center/right; language switch and account action at the end.
- Phase 1 navigation exposes only `Home`, `Sign in`/account state, and language. Do not display empty Catalog, Cart, Blog, or Wishlist destinations.
- Mobile header shows wordmark, language trigger, and menu trigger. Menu opens a right-side sheet with focus trap, Escape close, and focus return.
- Footer is minimal: localized copyright placeholder, language links, and no future policy links until Phase 7 content exists.

### Authentication Shell

- Desktop uses a centered two-column surface, max width 960px: a 40% warm brand/context panel and a 60% form panel.
- At widths below 768px, collapse to one column and omit the decorative panel; retain its trust statement above the form.
- Form column max width: 440px. Card padding: 24px mobile, 32px desktop.
- Every auth page includes one clear page heading, short context sentence, form, primary action, and one adjacent-route link.
- Password reset request and registration completion become calm confirmation states, not modal dialogs.

### Account Shell

- Protected route uses localized account URLs and server-rendered identity state.
- Desktop: 240px side navigation plus fluid content; mobile: page title and select/sheet navigation.
- Phase 1 account navigation includes only `Account overview` and `Sign out`. Do not create disabled placeholders for future orders, downloads, addresses, or wishlist.
- Account overview shows email, email verification status, active locale, and a security-oriented password reset link. Do not expose internal role or database identifiers.

### Admin Shell

- Entry route: `/admin`, outside localized public slugs. The admin interface language follows the authenticated user's saved locale, falling back to the current locale cookie and then English.
- Desktop uses a 256px dark sidebar and a 64px top bar. Mobile uses a dark top bar and navigation sheet.
- Header always shows `Admin`/`Quản trị`, signed-in email, locale control, and sign-out action.
- Phase 1 admin home is a boundary-confirmation dashboard only: role status, environment badge outside production, and foundation health placeholders backed by real checks if available.
- Do not display future catalog, order, payment, or fulfillment navigation until those modules exist.
- A non-admin must never see the admin shell briefly before redirect. Authorization is resolved server-side before render.

---

## Localization Contract

The following are locked by `01-CONTEXT.md`:

- Every customer-facing route uses `/vi` or `/en`.
- First unprefixed visit uses browser preference: Vietnamese when preferred, otherwise English.
- Language switching preserves the equivalent current page.
- Public slugs are translated, including `/vi/dang-nhap` and `/en/sign-in`.

Additional UI rules:

- Use a compact two-option language control labeled `VI` and `EN`; expose full accessible names `Tiếng Việt` and `English`.
- Desktop may use an inline segmented control. Mobile uses the same options in the header or menu sheet, never a flag icon.
- The current language uses accent text, a 2px underline or selected surface, and `aria-current`.
- Switching locale must preserve query parameters only when they are allowlisted and safe, including a validated relative `next` path.
- During navigation, keep the existing page visible and disable only the language control. Do not show a full-page spinner.
- Persist explicit choice in the locale cookie. Explicit URL locale always wins.
- Missing message keys are an implementation error: log a redacted diagnostic and render the English message as fallback. Never expose raw keys.
- Unsupported locale URLs redirect to the equivalent English route where one exists; avoid duplicate unprefixed content.
- Auth email links must return to the correct localized callback and resulting page.

### Localized Route Labels

| Purpose | Vietnamese | English |
|---------|------------|---------|
| Sign in | `/vi/dang-nhap` | `/en/sign-in` |
| Register | `/vi/dang-ky` | `/en/register` |
| Forgot password | `/vi/quen-mat-khau` | `/en/forgot-password` |
| Update password | `/vi/dat-lai-mat-khau` | `/en/reset-password` |
| Account | `/vi/tai-khoan` | `/en/account` |

Internal route names remain stable and map to these external paths through `next-intl`.

---

## Component Inventory

Use official shadcn components where listed after initialization. Keep component APIs locale-neutral and pass translated strings from route-level messages.

| Component | Basis | Contract |
|-----------|-------|----------|
| Button | shadcn `Button` | Primary, secondary outline, ghost, destructive; 44px minimum target; loading preserves width |
| Input | shadcn `Input` | 48px auth height; visible label; optional description; error tied with `aria-describedby` |
| Form field | shadcn `Form` pattern + server state | Label, control, hint, field error; no placeholder-only labels |
| Password field | Input + button | Show/hide toggle with accessible state text; never change field value or focus |
| Alert | shadcn `Alert` | Semantic icon, heading, action guidance; not color-only |
| Card | shadcn `Card` | 12px radius, border, no shadow by default |
| Sheet | shadcn `Sheet` | Mobile public/admin navigation; focus trap and focus restoration |
| Dropdown menu | shadcn `DropdownMenu` | Account menu only when enough actions exist; not required for language switching |
| Separator | shadcn `Separator` | Structural grouping, never decorative repetition |
| Skeleton | shadcn `Skeleton` | Shell-level loading only; match final geometry |
| Toast | shadcn `Sonner` or equivalent official pattern | Supplemental success only; errors requiring action stay inline |
| Status badge | Local component | Text + icon + semantic surface for verified, pending, admin, and environment |
| Locale switcher | Local component | Route-aware VI/EN selection preserving equivalent path |
| Empty state | Local composition | Icon, heading, body, optional action; no illustration dependency |

Use native links for navigation and buttons for actions. Icon-only controls require a tooltip on pointer devices and an accessible name on all devices.

---

## Authentication Interaction Contract

### Register

- Fields: email, password, confirm password.
- Password guidance appears before submission and uses the server-aligned rules.
- Primary CTA: `Tạo tài khoản` / `Create account`.
- On success, replace the form with the verification confirmation and an action to return to sign-in.
- Do not imply that registration blocks future guest checkout.

### Sign In

- Fields: email and password.
- Primary CTA: `Đăng nhập` / `Sign in`.
- Secondary links: create account and forgot password.
- Preserve only validated, same-origin localized `next` destinations.
- After sign-in: use validated `next`; otherwise go to localized account overview. Admins entering through `/admin` return to admin.

### Forgot Password

- Field: email.
- Primary CTA: `Gửi hướng dẫn` / `Send instructions`.
- Always show the same success state whether the address exists.
- Provide a clear return-to-sign-in link.

### Reset Password

- Valid recovery session: new password and confirmation fields.
- Invalid or expired recovery session: no password form; explain that the link cannot be used and offer a new reset request.
- Primary CTA: `Cập nhật mật khẩu` / `Update password`.
- On success, show confirmation and link to localized sign-in.

### Sign Out

- Sign-out is immediate from account/admin menus and does not require confirmation.
- Disable the initiating control while pending.
- Redirect to the current locale home and show a non-blocking localized success notice.

### Email Verification

- Pending state explains that the customer must open the email link and check spam.
- Resend is secondary, rate-limit aware, and reports when another request can be made.
- Verification success links to sign-in unless a valid session already exists, in which case it links to account.

---

## Form, Validation, and Error Contract

- Validate on blur after a field has been touched and again on submit. Do not show errors on initial focus.
- Server errors are authoritative and must remain visible until the user changes the relevant input or retries.
- Place field errors directly below fields. Place cross-field or server errors in an alert above the primary action.
- Move focus to the first invalid field after submit. For page-level failures, focus the alert heading.
- Preserve safe field values after failure; never preserve password fields after a server round trip.
- Pending submit state disables duplicate submission, changes label to a localized progress phrase, and shows a 16px spinner.
- Do not expose Supabase error strings, stack traces, role-table details, or whether an email is registered.
- Network failure copy must state that the action was not completed and invite retry.
- Unauthorized admin access uses a dedicated 403 page for signed-in non-admins; anonymous visitors are redirected to sign-in with a validated return path.
- Session expiry shows a localized notice at sign-in: the session ended and the user must sign in again.

### Accessibility

- Meet WCAG 2.2 AA.
- Keyboard focus is always visible with a 2px accent ring and 2px background offset.
- Error and status icons are decorative when adjacent text conveys the same meaning.
- Use `aria-live="polite"` for success/status updates and `role="alert"` for submit failures.
- Dialogs and sheets trap focus, close with Escape, and restore focus.
- Respect 200% text zoom and browser font scaling without clipped controls.
- Do not automatically focus the first field on mobile, which would open the keyboard before the user chooses to interact.

---

## Copywriting Contract

Tone is warm, plain, and precise. Address the user directly. Avoid craft-themed jokes in security and error states. Vietnamese copy should be natural rather than a literal English translation; English should use concise international phrasing.

| Element | Vietnamese | English |
|---------|------------|---------|
| Public primary CTA | `Đăng nhập` | `Sign in` |
| Register CTA | `Tạo tài khoản` | `Create account` |
| Reset request CTA | `Gửi hướng dẫn` | `Send instructions` |
| Reset CTA | `Cập nhật mật khẩu` | `Update password` |
| Account empty heading | `Tài khoản của bạn đã sẵn sàng` | `Your account is ready` |
| Account empty body | `Thông tin mua hàng và mẫu tải xuống sẽ xuất hiện ở đây khi các tính năng đó được mở.` | `Purchases and downloadable patterns will appear here when those features are available.` |
| Generic form error | `Chưa thể hoàn tất yêu cầu. Kiểm tra thông tin và thử lại.` | `We couldn't complete that request. Check the details and try again.` |
| Network error | `Kết nối bị gián đoạn. Yêu cầu chưa được hoàn tất; vui lòng thử lại.` | `The connection was interrupted. Your request was not completed; please try again.` |
| Reset request success | `Nếu email này có tài khoản, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.` | `If an account exists for this email, we've sent password reset instructions.` |
| Verification pending | `Kiểm tra email để xác nhận tài khoản trước khi đăng nhập.` | `Check your email to verify your account before signing in.` |
| Session expired | `Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.` | `Your session has ended. Please sign in again.` |
| Admin forbidden heading | `Bạn không có quyền truy cập` | `You don't have access` |
| Admin forbidden body | `Tài khoản này không có quyền quản trị. Quay lại cửa hàng hoặc đăng nhập bằng tài khoản khác.` | `This account does not have admin access. Return to the store or sign in with another account.` |

Destructive actions in Phase 1: none. Sign-out is reversible through sign-in and does not use destructive styling or confirmation. Account deletion and role changes are out of scope.

---

## States

Every route or major component must define these states where applicable:

| State | Contract |
|-------|----------|
| Default | Complete localized content and enabled valid actions |
| Hover | Subtle surface or underline change; no layout shift |
| Focus | 2px accent ring with offset; at least as visible as hover |
| Active | 1px visual press or darker fill; no scale animation |
| Disabled | Reduced contrast but readable; cursor alone does not communicate state |
| Pending | Control-local spinner and stable label width; prevent duplicate action |
| Success | Inline confirmation with success icon/color and next action |
| Empty | Explain why no data exists and whether action is needed |
| Validation error | Field-level text plus page summary when multiple fields fail |
| Server error | Persistent alert with retry or safe navigation |
| Unauthorized | Redirect anonymous users; render explicit 403 for signed-in non-admins |
| Offline/network | State that completion is unknown or failed; provide retry |

Skeletons are allowed for shell transitions only. Authentication and authorization must not depend on client-side skeletons to conceal unresolved access.

---

## Motion

- Standard transition: 150ms ease-out for color, border, opacity, and small position changes.
- Sheet/dialog entrance: 200ms ease-out; exit: 150ms ease-in.
- Do not animate page content more than 8px.
- Do not use spring, bounce, parallax, continuous animation, or celebratory effects in Phase 1.
- Loading spinners rotate continuously but must be hidden from screen readers when adjacent text describes progress.
- Under `prefers-reduced-motion: reduce`, remove transforms and use immediate or opacity-only transitions under 100ms.
- Locale switching must not animate old text into new text; use normal route transition behavior.

---

## Responsive Rules

Use content-driven layouts with these contract breakpoints:

| Range | Contract |
|-------|----------|
| 320-479px | 16px gutters, single-column auth, compact wordmark, sheet navigation, full-width primary buttons |
| 480-767px | 24px gutters, single-column auth, buttons may fit content except form submit remains full width |
| 768-1023px | Desktop public navigation when labels fit; account/admin use collapsible or sheet navigation |
| 1024-1279px | Persistent account/admin sidebar, 40px page gutters, two-column auth |
| 1280px+ | 1200px public max width, 48px gutters, persistent shells |

Rules:

- No horizontal scrolling at 320px except intentional code/data regions, which Phase 1 does not need.
- Navigation must tolerate Vietnamese labels without truncation.
- Use wrapping before ellipsis for headings and action labels.
- Sticky public header is optional; if used, it must not reduce viewport usability when the mobile keyboard is open.
- Admin sidebar may collapse only to a fully labeled sheet on smaller screens; do not use an unlabeled icon rail in Phase 1.
- Touch targets remain 44px minimum with 8px separation where adjacent.

---

## Security-Sensitive UI Boundaries

- UI visibility is never treated as authorization.
- Resolve customer/admin status on the server before rendering protected shells.
- Do not render privileged actions and then disable them for non-admins.
- Do not show raw user role records, access tokens, refresh tokens, provider payloads, service keys, or internal authorization diagnostics.
- Environment badges may show `Local`, `Preview`, or `Production`; they must never include project IDs or secrets.
- Admin denial copy must not reveal whether another user has admin access.
- Generic password-reset responses prevent email enumeration.
- Safe redirect handling must reject external, protocol-relative, unsupported-locale, and malformed destinations.

---

## Explicit Anti-Patterns

- No flags for language selection.
- No English-only fallback pages in Vietnamese journeys.
- No unprefixed duplicate public pages.
- No language switch that sends users to the home page.
- No auth forms inside modal dialogs.
- No placeholder-only form labels.
- No password requirements revealed only after submission.
- No raw provider or database error messages.
- No client-side flash of account/admin content before redirect.
- No future-feature navigation placeholders.
- No gradients, glassmorphism, neon colors, heavy drop shadows, skeuomorphic yarn textures, or excessive crochet decoration.
- No cursive/script font for UI text.
- No color-only status communication.
- No icon-only mobile navigation without accessible labels.
- No disabled button without an adjacent explanation when the reason is not obvious.
- No toast as the only place for actionable errors.
- No automatic account requirement language that conflicts with future guest checkout.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Planned: Button, Input, Form pattern, Alert, Card, Sheet, Separator, Skeleton, DropdownMenu, optional Sonner | Official registry only; initialize and inspect generated source during Phase 1 execution |
| Third-party registries | None | Not applicable - prohibited by this Phase 1 contract |

No `components.json` exists as of 2026-06-12. The user explicitly deferred shadcn initialization to Phase 1 execution/scaffolding. This contract selects the system without claiming it is installed.

---

## Implementation Acceptance Checklist

- [ ] Locale-prefixed and translated routes match the locked route contract.
- [ ] Language switch preserves the equivalent page and safe query context.
- [ ] Public, auth, account, and admin shells match their layout contracts at 320px, 768px, 1024px, and 1280px.
- [ ] Typography uses only the four declared sizes and two declared weights.
- [ ] Components consume semantic color, spacing, radius, and elevation tokens.
- [ ] Auth forms have persistent labels, inline validation, accessible error associations, pending states, and generic recovery responses.
- [ ] Protected shells render only after server-side identity and authorization checks.
- [ ] Keyboard, focus, reduced-motion, zoom, and contrast requirements pass.
- [ ] Vietnamese and English copy is complete and does not expose raw technical errors.
- [ ] No out-of-scope catalog, cart, payment, order, or fulfillment UI is introduced.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
