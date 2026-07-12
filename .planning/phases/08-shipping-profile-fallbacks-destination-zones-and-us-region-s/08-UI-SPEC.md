---
phase: 08-shipping-profile-fallbacks-destination-zones-and-us-region-s
status: draft
scope:
  - Admin Shipping
  - Checkout Destination and Shipping Quote
design_system: existing restrained admin styling with shadcn primitives
---

# Phase 08 UI Specification

## Intent

This phase must make shipping configuration precise for administrators and shipping eligibility clear and recoverable for customers. The UI must expose the rule hierarchy without visual clutter, prevent invalid configurations, and make every quote transition understandable without interrupting checkout.

Admin Shipping optimizes for scanning, comparison, and safe editing. Checkout optimizes for conversion: disclose only destination fields currently required, keep shipping feedback adjacent to those fields, preserve entered data, and never present unsupported shipping as a zero-cost option.

The contract covers:

- Parcel profiles with migration-safe readiness: zero defaults may exist until an administrator explicitly selects one; after selection, exactly one active default is maintained atomically.
- Exact-country shipping rules.
- One `Other countries` fallback per currency.
- United States region surcharge or replacement adjustments.
- Product- and variant-level parcel-profile assignments.
- Immediate checkout quoting after country selection.
- Progressive US state/territory disclosure and re-quoting.
- Material quote-change confirmation.
- Recoverable unsupported-shipping behavior.

## Visual Hierarchy

### Admin Shipping

1. Page title and one-sentence explanation.
2. Section navigation or vertically ordered sections: Parcel profiles, Destination rules, US region adjustments, Assignments.
3. Section heading, concise status summary, and primary section action.
4. Dense, aligned data rows with status and row actions in stable positions.
5. Controlled Sheet for create/edit forms.
6. Inline validation and destructive confirmation closest to the affected control.

Use a single main column. Do not place multiple independently scrolling panels side by side. Desktop tables may be visually dense but must retain clear headers, stable row heights, and a consistent trailing action column.

### Checkout

1. Destination heading and short instruction.
2. Country selector.
3. US state/territory selector, revealed only when the United States is selected.
4. Postal code, required for final US submission and positioned directly after state/territory.
5. Quote status directly below the destination controls.
6. Material-change confirmation when required.
7. Checkout continuation action.

Quote loading, success, changed, and unsupported states must remain in the same reserved status region to prevent layout jumps.

## Design Tokens

Use the concrete tokens already present in the application. Do not introduce a parallel token system. Where an existing token maps to the values below, use that token rather than a literal.

### Spacing

Use the 4/8-point scale only:

| Purpose | Value |
|---|---:|
| Icon-to-label gap | 4px |
| Tight inline gap | 8px |
| Control-group gap | 8px |
| Standard row/cell padding | 16px |
| Form-field vertical gap | 16px |
| Card/surface padding, mobile | 16px |
| Section internal gap | 16px |
| Card/surface padding, desktop | 24px |
| Section gap | 32px |
| Major page region gap | 48px |

No arbitrary spacing values. Use 4px only for micro-spacing; primary layout rhythm is 8px.

### Typography

Use exactly four text sizes and two font weights:

| Role | Size / line height | Weight |
|---|---|---:|
| Metadata, helper, compact table text | 14px / 20px | 400 |
| Body, labels, controls | 16px / 24px | 400 |
| Section heading | 20px / 24px | 600 |
| Page heading | 28px / 34px | 600 |

Labels, buttons, active navigation, column headers, and emphasized totals may use 600. Do not use additional weights. Table headers may use 14px/20px at 600.

### Color

Follow the existing restrained palette and semantic tokens:

- 60% dominant: page background and primary checkout surface.
- 30% secondary: cards, Sheets, muted table headers, disclosure rows, and quote-status region.
- 10% accent: primary actions, selected controls, active focus indicators, links, and confirmed quote emphasis only.
- Destructive semantic color: delete actions, invalid configuration, and blocking shipping errors only.
- Success semantic color: confirmed valid quote and saved state only; never use success color decoratively.

Color must not be the sole status indicator. Pair every semantic color with text and, where helpful, an existing icon.

### Radius, Borders, and Elevation

- Cards and large surfaces: 8px radius maximum.
- Inputs, selects, buttons, table containers, and Sheets: use the existing application radius, capped at 8px.
- Badges: use the existing small badge radius; do not introduce oversized pill containers.
- Use one 1px neutral border per bounded surface.
- Avoid nested bordered cards. Inside a surface, separate groups with spacing, headings, dividers, or muted backgrounds.
- Use existing restrained elevation for Sheets and overlays only. Data cards and tables remain flat.

### Control and Row Dimensions

- Desktop input/select/button height: 40px.
- Mobile input/select/button and icon-only target: minimum 44px high and 44px wide.
- Desktop table header: 40px.
- Desktop standard data row: 48px minimum; use 56px only when a secondary line is present.
- Disclosure row summary: 56px minimum.
- Inline action icon visual size: 16–20px within a compliant target.
- Sheet width: 440px desktop for standard forms; 520px maximum for forms that require side-by-side amount and currency controls.
- Sheet on viewports below 640px: full width and full height, with sticky header and footer actions.

## Surfaces and Layout

### Admin Shipping — Desktop

- Page content width follows the existing admin shell and must never cause viewport-level horizontal scrolling at 1280px and above.
- Page header uses a single row when space allows: title and explanation left; only the page-level primary action right. Section-specific actions remain in section headers.
- Stack the four management sections vertically with 32px between them.
- Each section uses one bounded surface with 24px padding and 8px radius. Do not wrap the table/list in a second card.
- Section header uses aligned title/status content left and one primary action right. Maintain 16px between header and content.
- Tables use fixed or constrained columns. Flexible name/description columns absorb remaining width; amount, status, assignment, and action columns retain stable widths.
- Long product, variant, country, or profile names truncate to one line with a native/title or accessible tooltip containing the full value.
- Row actions remain in the final column. Use one visible primary row action where appropriate and an overflow menu for secondary/destructive actions.
- Empty states occupy the normal list region and do not alter section width or padding.

#### Parcel Profiles

- Columns: Profile name, parcel summary, assignment count, status, actions.
- Parcel summary is a single compact line using the stored dimensions and weight units.
- The default profile displays a persistent `Default` badge next to its name.
- Before an administrator has explicitly selected a post-migration default, zero rows may show `Default` and the section must show a blocking readiness warning. After selection, exactly one active row shows `Default`.
- `Set as default` is available only for non-default profiles.
- Deleting the current default is blocked until another profile is made default.

#### Destination Rules

- Group rules by currency, with a compact currency heading and rule count.
- Within each currency group, exact-country rows appear before the single `Other countries` fallback.
- Columns: Destination, method/rule label, fee, profile applicability if applicable, status, actions.
- The fallback row is visually identifiable with the label `Other countries`; it must not rely on color or row position alone.
- The add-rule flow prevents creating a second fallback for the same currency.

#### US Region Adjustments

- Columns: Region, associated parcel profile/rule, included states/territories summary, adjustment type, first-item amount, additional-item amount, status, actions.
- Every adjustment visibly identifies the parcel profile or destination rule it modifies. Never rely on a hidden relation or Sheet-only detail to communicate association.
- Adjustment type is explicit text: `Add surcharge` or `Replace shipping fee`.
- First-item and additional-item amounts remain separate, labeled values for both surcharge and replacement modes; do not collapse them into one generic amount.
- State/territory summaries show up to three codes, then `+N more`; the full list is available from the row action or accessible tooltip.
- Region editing uses controlled state/territory multi-selection and prevents duplicate membership where business rules disallow overlap.

#### Assignments

- Default view scans by product, then variant.
- Columns: Product, Variant, Effective parcel profile, Assignment source, actions.
- Assignment source reads `Product`, `Variant override`, or `Store default`.
- The effective profile is always visible; inherited values must never appear blank.
- Variant overrides are visually indicated with text, not indentation alone.

### Admin Shipping — Mobile

- At widths below 768px, dense tables transform into disclosure rows or stacked label-value groups.
- Each summary row exposes the record name, primary value/status, and a 44px disclosure/action target.
- Expanded content uses a two-column label-value grid where possible: label width 40%, value width 60%; switch to stacked label-over-value below 380px.
- Essential actions remain visible in the expanded row: Edit, set default where applicable, and overflow/destructive action.
- Do not hide fees, default/fallback status, effective parcel profile, adjustment type, or enabled/disabled state.
- Cards use 16px padding and remain flush to the mobile content grid. Do not create one card per row.
- Create/edit uses a full-screen Sheet. The title and close control remain sticky at top; contextual dismissal and save actions remain sticky at bottom and respect safe-area insets.

### Checkout — Desktop

- `DestinationForm` remains within the existing checkout information column.
- Destination controls use a maximum readable form width of 560px.
- Country uses a full-width row.
- For US destinations, state/territory and postal code may share a two-column row with an 16px gap; each field remains at least 200px wide.
- Reserve at least 56px below destination fields for quote status so loading and messages do not move downstream checkout content.
- `QuoteDiffDialog` is used only for material changes that require explicit confirmation, not for ordinary initial quotes or non-material re-quotes.

### Checkout — Mobile

- Destination fields stack in disclosure order: Country, State/territory when US, Postal code when US.
- All controls and primary actions are at least 44px high.
- Quote status stays directly beneath the final visible destination field.
- Dialog actions stack vertically at widths below 480px, with the primary action first visually and last in DOM only if existing dialog conventions require it; preserve logical keyboard order.
- No automatic scroll-to-top, focus jump, or page reload occurs during quoting.

## Interaction Contracts

### Admin: Parcel Profiles

- Create and edit open a controlled Sheet; only one Sheet may be open at a time.
- Opening a Sheet focuses its heading or first invalid/first editable field according to existing conventions.
- Save remains disabled while required values are missing, values are invalid, or submission is in progress.
- Successful save closes the Sheet, updates the originating row in place, and announces success.
- If the saved record is new, place it according to the list's deterministic ordering without jumping the page.
- A migrated installation may have zero defaults until an administrator explicitly chooses one. In that state, show a persistent blocking readiness warning: shipping configuration is not ready for destinations that cannot resolve through an exact or attached rule/profile.
- Setting the first default requires a lightweight confirmation that names the selected profile. Replacing an existing default states both previous and new defaults. The write is atomic: once selected, the new profile becomes active as the prior profile ceases to be active, and uniqueness guarantees exactly one active default.
- A default profile cannot be deleted. Explain the recovery action inline or in the destructive dialog: choose another default first.
- Delete confirmation names the profile and reports assignment impact. Never use a generic `Are you sure?` message.

### Admin: Destination Rules and Fallbacks

- Add/edit uses a controlled Sheet.
- Currency is explicit and immutable after creation if changing it could violate the one-fallback-per-currency rule; otherwise revalidate immediately when changed.
- Destination mode is selected as `Specific country` or `Other countries`.
- Selecting `Other countries` disables country selection and checks uniqueness for the active currency.
- If a fallback already exists, the unavailable option includes the reason and identifies the existing fallback.
- Exact-country duplication is validated before submission and surfaced beside the country control.
- Fee amount and currency remain aligned and are read together by assistive technology.
- Unsupported destinations remain unsupported; absence of a rule must never render or serialize as a zero fee.

### Admin: US Region Adjustments

- Add/edit uses a controlled Sheet.
- Adjustment type is a two-option control: `Add surcharge` and `Replace shipping fee`.
- A required association control identifies the parcel profile or destination rule the adjustment modifies; the selected association remains visible in list and detail states.
- Both modes expose separate required numeric inputs labeled `First item` and `Each additional item`. Helper copy explains whether the values are added to or replace the resolved shipping fee.
- State/territory selection uses controlled options with normalized two-letter codes and readable names.
- Save is blocked when no association or state/territory is selected, either amount is invalid, or rule overlap is invalid.
- Changing adjustment type preserves both entered amounts unless validation makes either invalid; explain any reset before applying it.

### Admin: Product and Variant Assignments

- Editing an assignment opens a compact controlled Sheet or existing assignment Sheet pattern.
- Product assignment applies to variants without overrides.
- Variant assignment explicitly overrides the product assignment.
- Removing a variant override immediately previews the inherited effective profile before save.
- The selector distinguishes `Store default`, inherited product profile, and explicit profile options.
- Save updates the effective profile and assignment source in the same row without a page refresh.

### Checkout: Destination and Quote Lifecycle

- Country selection triggers a quote immediately when enough destination data exists for that country.
- Selecting the United States reveals the controlled State/territory field and Postal code field progressively without clearing other checkout data.
- For the US, state/territory selection triggers a re-quote immediately. Postal code is required for final submission; if postal code affects quoting, debounce quote requests according to existing behavior and never quote clearly incomplete input.
- State/territory values submitted to the server must be normalized two-letter codes from the controlled selector. Do not accept free-form state names for final submission.
- Final US submission is blocked until country, normalized state/territory, and postal code are valid.
- Shipping resolution follows the configured hierarchy. Zero default is valid during migration: checkout must continue when the destination resolves through an exact rule or an attached product/variant profile/rule. Checkout fails only when no exact, attached, or active-default resolution exists.
- Every quote request receives a monotonically increasing request identity or equivalent cancellation guard. Only the latest request may update visible quote, errors, checkout totals, or confirmation state.
- While re-quoting, preserve the last confirmed quote visually but mark it `Updating shipping…`; do not briefly show zero, blank, or stale data as current.
- Non-material changes update totals in place and announce the new shipping result.
- Material changes open `QuoteDiffDialog` showing previous and proposed shipping method/fee and resulting order-total difference.
- Until a material change is accepted, the previous confirmed quote remains the committed selection and checkout submission remains blocked if it no longer matches the destination.
- `Use updated shipping` commits the new quote. `Review destination` closes the dialog, keeps entered data, returns focus to the first destination field relevant to the change, and allows correction.
- Closing the material-change dialog without choosing an action does not silently accept the new quote.
- Unsupported shipping displays a blocking but recoverable status near the destination controls. Preserve all entered values and provide a clear destination-edit action.
- Unsupported shipping is never represented as `$0`, `0 ₫`, `Free`, a selectable method, or a valid quote object.
- Network and server failures are distinct from unsupported shipping and include retry behavior.
- Quote updates must not trigger disruptive page jumps or reset unrelated checkout fields.

## Component Choices

Use existing shadcn primitives and existing project components. Do not add a third-party registry.

| Need | Component contract |
|---|---|
| Admin create/edit | Existing controlled `Sheet`, `SheetHeader`, `SheetContent`, `SheetFooter` pattern |
| Standard fields | Existing `Form`, `FormField`, `Label`, `Input`, `Select`, and validation message patterns |
| Country/state selection | Controlled `Select` or existing searchable combobox when option volume requires search |
| Adjustment type | Existing `RadioGroup` or two-option segmented control with explicit labels |
| State/territory multi-select | Existing accessible command/checkbox popover pattern; selected values summarized as codes |
| Dense desktop records | Existing `Table` primitives with constrained columns and stable row dimensions |
| Mobile records | Existing `Collapsible`/disclosure primitives or semantic button-controlled regions |
| Status | Existing `Badge`, inline status region, and semantic icon patterns |
| Secondary row actions | Existing `DropdownMenu` |
| Destructive confirmation | Existing `AlertDialog` |
| Material checkout change | Existing `QuoteDiffDialog` |
| Destination entry | Existing `DestinationForm` integrated into `CheckoutPage` |
| Loading | Inline spinner plus text in a reserved live status region; skeletons only for initial list loading |
| Notifications | Existing toast for non-blocking save success; inline message for actionable errors |

Do not replace `DestinationForm`, `CheckoutPage`, or `QuoteDiffDialog` with parallel components. Extend their current contracts.

## Form and Sheet Contracts

- Every field has a persistent visible label. Placeholder text is example content only and never substitutes for a label.
- Required fields are identified in the label and programmatically.
- Helper copy appears only when it prevents a likely error; keep it to one sentence.
- Validation appears directly below the field, uses 14px/20px text, and does not disappear until corrected.
- Sheet footer contains a contextual dismissal action and a specific save action. Use `Discard new profile`, `Discard profile changes`, `Discard new rule`, `Discard rule changes`, `Discard new adjustment`, `Discard adjustment changes`, or `Keep current assignment` according to the flow. Desktop actions align right with 8px gap; mobile actions span available width.
- Preserve unsaved input when a server validation error occurs.
- If closing a dirty Sheet would discard edits, show a discard confirmation. Clean Sheets close immediately.
- Submission controls show a text state such as `Saving…` and cannot be activated twice.
- Server errors focus the first invalid field or an error summary linked to affected fields.

## States

### Admin Lists

| State | Required presentation |
|---|---|
| Initial loading | Stable section shell and row skeletons matching final row dimensions |
| Empty | Plain-language explanation and one section action; no decorative oversized illustration |
| Populated | Stable rows, aligned values, persistent statuses and actions |
| Filtering/searching, if present | Result count and clear reset action; no-results differs from true empty state |
| Saving | Sheet remains open, inputs protected from duplicate submission, `Saving…` action |
| Saved | Row updates in place; concise live announcement/toast |
| Validation error | Inline field error; preserve values |
| Load/save failure | Inline actionable error with Retry; preserve context |
| Destructive blocked | Explain dependency and recovery action; do not present enabled destructive submit |

### Checkout Quote

| State | Required presentation |
|---|---|
| Awaiting destination | `Choose a destination to calculate shipping.` |
| Awaiting US state | `Select a state or territory to calculate shipping.` |
| Loading initial quote | Spinner + `Calculating shipping…` |
| Updating quote | Preserve last confirmed amount + spinner + `Updating shipping…` |
| Quote available | Method/eligibility label and formatted fee; update order total consistently |
| Material change | `QuoteDiffDialog` with previous, proposed, and total difference |
| Unsupported | Blocking message, no zero-price representation, `Edit destination` action |
| Network/server error | `We couldn’t update shipping. Check your connection and try again.` + `Try again` |
| Stale response | No visible update; ignored silently except development diagnostics |
| Final US invalid | Inline errors for state/territory and postal; focus first invalid field |

The quote status container uses `min-height: 56px` on desktop and mobile. Longer messages may expand downward; content below must not overlap.

## Copy Contract

All customer-facing copy must be localized in Vietnamese and English through the existing localization system. Admin copy follows the existing admin language convention. Do not hard-code locale-specific currency formatting.

### Admin Actions

| Context | Label |
|---|---|
| New parcel profile | `Add parcel profile` |
| Save new profile | `Create profile` |
| Save edited profile | `Save profile` |
| Change default | `Set as default` |
| New destination rule | `Add destination rule` |
| Save destination rule | `Save rule` |
| New US adjustment | `Add US region adjustment` |
| Save US adjustment | `Save adjustment` |
| Edit assignment | `Change parcel profile` |
| Save assignment | `Save assignment` |
| Dismiss new parcel profile | `Discard new profile` |
| Dismiss parcel profile edit | `Discard profile changes` |
| Dismiss new destination rule | `Discard new rule` |
| Dismiss destination rule edit | `Discard rule changes` |
| Dismiss new US adjustment | `Discard new adjustment` |
| Dismiss US adjustment edit | `Discard adjustment changes` |
| Dismiss assignment edit | `Keep current assignment` |
| Retry failed operation | `Try again` |

### Admin Empty States

- Parcel profiles: `No parcel profiles yet. Add a profile to define package dimensions and weight.`
- Destination rules: `No destination rules for this currency. Add a country rule or an Other countries fallback.`
- US adjustments: `No US region adjustments. Standard destination rules apply to every state and territory.`
- Assignments: `No explicit assignments. Products and variants use the store default parcel profile.`

### Admin Errors and Confirmations

- Migration readiness warning: `Shipping setup is not ready for destinations without an exact or attached profile rule. Select a default parcel profile to provide a fallback.`
- Duplicate fallback: `An Other countries fallback already exists for {currency}. Edit the existing fallback instead.`
- Duplicate country: `A shipping rule for {country} already exists in {currency}.`
- Default deletion blocked: `“{profile}” is the default parcel profile. Set another profile as default before deleting it.`
- Set-default confirmation title: `Change the default parcel profile?`
- Set-default confirmation body: `New unassigned products and variants will use “{newProfile}” instead of “{oldProfile}”.`
- Delete confirmation title: `Delete “{profile}”?`
- Delete confirmation body: `This permanently removes the parcel profile. Review {count} affected assignments before continuing.`

### Checkout Copy

- Country label: `Country or region`
- US subdivision label: `State or territory`
- Postal label: `ZIP or postal code`
- Initial status: `Choose a destination to calculate shipping.`
- Awaiting state: `Select a state or territory to calculate shipping.`
- Initial loading: `Calculating shipping…`
- Re-quote loading: `Updating shipping…`
- Unsupported title: `Shipping isn’t available to this destination.`
- Unsupported body: `Edit your destination or contact us for help.`
- Unsupported action: `Edit destination`
- Quote error: `We couldn’t update shipping. Check your connection and try again.`
- Retry action: `Try again`
- Material-change dialog title: `Shipping changed for this destination`
- Material-change explanation: `Review the updated shipping cost before continuing.`
- Accept changed quote: `Use updated shipping`
- Return to fields: `Review destination`

Currency amounts use locale-aware formatting: VND with the established VND convention and USD with two fractional digits. Never substitute `Free` unless a valid, supported shipping rule explicitly returns a zero fee.

## Accessibility

- All controls meet WCAG 2.2 AA contrast using existing semantic tokens.
- Visible keyboard focus uses the existing accent focus ring with at least 2px effective thickness and clear separation from the control border.
- Desktop controls have at least 40px height; all mobile interactive targets are at least 44×44px.
- Tables use semantic headers and appropriate scope. Mobile disclosures use a button with `aria-expanded` and `aria-controls`.
- Icon-only buttons have accessible names. Decorative icons are hidden from assistive technology.
- Sheet and dialog focus is trapped while open, Escape behavior follows existing primitives, and focus returns to the invoking control after close.
- Required, invalid, and described-by relationships are programmatic. Error text is associated with its field.
- Quote status uses `role="status"` and `aria-live="polite"` for loading and successful changes.
- Blocking unsupported-shipping and quote failures use an assertive announcement only when newly introduced; repeated retries must not create announcement spam.
- Material-change dialog announces its title and description and places initial focus on the dialog heading or safe secondary action, following existing Alert/Dialog conventions.
- When US fields appear, do not unexpectedly move focus. Announce availability through the destination region's polite live message; the user's next Tab reaches the new field.
- Loading indicators include text. Motion is non-essential and respects reduced-motion preferences.
- Truncated visible values remain available through accessible text or a keyboard-accessible tooltip.
- Status badges always include meaningful text such as `Default`, `Enabled`, or `Disabled`.

## Responsive Behavior

| Viewport | Contract |
|---|---|
| ≥1280px | Full admin table layouts; no viewport horizontal scrolling; Sheets 440–520px |
| 1024–1279px | Constrain secondary columns, truncate long names, retain table actions and essential values |
| 768–1023px | Use tables only when every essential column fits without horizontal scrolling; otherwise switch to disclosure rows |
| <768px | Admin disclosure/stacked groups, 16px surface padding, full-screen Sheets, 44px targets |
| <640px | Checkout destination fields stack; dialog approaches full available width with 16px viewport inset |
| <480px | Dialog/footer actions stack; labels and values may stack when horizontal pairing harms readability |
| <380px | Mobile admin detail grids become label-over-value blocks |

Responsive transformations must preserve all essential actions and data. Horizontal scrolling is not an accepted desktop or mobile strategy for this phase.

## Anti-Patterns

- No nested cards, card-per-row layouts, or boxed field groups inside boxed Sheets.
- No uneven card heights in the same visual row.
- No radius above 8px for cards or major surfaces.
- No desktop horizontal page or table scrolling.
- No unlabeled controls, placeholder-only fields, or icon-only actions without accessible names.
- No free-form US state/territory input.
- No quote request whose stale response can overwrite newer destination state.
- No clearing checkout data when country or state changes.
- No page jump, full-page loading overlay, or automatic scroll during quoting.
- No unsupported destination represented as zero-cost, free, selectable, or successful.
- No silent assumption that a migrated installation already has a default. Zero defaults are allowed only until explicit selection, with a blocking readiness warning.
- No removal or replacement of an active default unless the resulting atomic operation leaves exactly one active default.
- No second `Other countries` fallback for the same currency.
- No ambiguous adjustment values without `Add surcharge` or `Replace shipping fee` text.
- No hidden inherited parcel profile; always show the effective value and source.
- No destructive action mixed with primary actions without confirmation and impact copy.
- No third-party component registry or parallel design system.
- No decorative accent use that competes with primary actions or shipping status.

## Acceptance Checklist

### Global Visual Contract

- [ ] Existing restrained admin styling and shadcn primitives are used throughout.
- [ ] Only existing project design tokens are used; spacing follows the specified 4/8-point scale.
- [ ] Cards and major surfaces use radius no greater than 8px.
- [ ] Standard desktop rows remain at least 48px and do not vary without secondary content.
- [ ] Mobile interactive targets measure at least 44×44px.
- [ ] There are no nested-card clusters, uneven peer cards, or viewport-level horizontal scrollbars.
- [ ] Typography uses only 14, 16, 20, and 28px sizes and only 400 and 600 weights.

### Admin Shipping

- [ ] Admin sections appear in the defined hierarchy and scan efficiently at 1280px.
- [ ] Parcel profiles show dimensions/weight summary, assignment count, status, and stable actions.
- [ ] A migrated installation may show zero defaults until explicit administrator selection and then shows a persistent blocking readiness warning.
- [ ] After explicit selection, exactly one parcel profile is visibly and functionally the active default.
- [ ] The current default cannot be deleted; recovery instructions identify the required action.
- [ ] First selection names the new default; replacement identifies old and new profiles and atomically preserves active-default uniqueness.
- [ ] Exact-country rules and `Other countries` fallbacks are grouped by currency.
- [ ] A second `Other countries` fallback for the same currency cannot be submitted.
- [ ] US adjustments explicitly display region, associated profile/rule, included codes, adjustment type, first-item amount, and additional-item amount.
- [ ] Adjustment forms prevent empty state sets, invalid values, and disallowed overlaps.
- [ ] Assignments always show effective profile and source: Store default, Product, or Variant override.
- [ ] Removing a variant override previews the inherited profile before save.
- [ ] Create/edit operations use controlled Sheets with preserved values and specific action copy.
- [ ] Mobile admin tables become accessible disclosure or stacked label-value rows.
- [ ] Mobile transformations retain fees, statuses, default/fallback markers, effective profiles, and actions.
- [ ] Full-screen mobile Sheets have sticky header/footer and safe-area-aware actions.

### Checkout

- [ ] Country selection triggers quoting as soon as destination data is sufficient.
- [ ] Selecting the US progressively reveals controlled state/territory and postal fields.
- [ ] Selecting a US state/territory triggers an immediate re-quote.
- [ ] Only normalized two-letter state/territory codes can be submitted.
- [ ] Final US submission is blocked without valid state/territory and postal data.
- [ ] Only the latest quote request can update the quote, errors, totals, or dialog state.
- [ ] Re-quoting preserves the previous confirmed quote and displays `Updating shipping…`.
- [ ] The quote status region remains adjacent to destination fields and reserves at least 56px.
- [ ] Quote updates do not clear unrelated data, reload the page, or cause disruptive jumps.
- [ ] Non-material quote changes update in place and are announced politely.
- [ ] Material changes open `QuoteDiffDialog` with previous/proposed values and order-total difference.
- [ ] Material changes are never silently accepted by closing the dialog.
- [ ] Unsupported shipping is recoverable, preserves input, and offers `Edit destination`.
- [ ] Unsupported shipping is never shown as zero, free, or selectable.
- [ ] Checkout succeeds without a default when an exact or attached profile/rule resolves shipping, and fails only when no exact, attached, or active-default resolution exists.
- [ ] Network/server errors are distinct from unsupported shipping and offer `Try again`.
- [ ] Checkout copy is localized and currency is locale-formatted.

### Accessibility and State Coverage

- [ ] Every field has a visible label and associated inline errors.
- [ ] Focus order remains logical when US fields appear and when Sheets/dialogs close.
- [ ] Tables, disclosure rows, menus, Sheets, and dialogs are keyboard operable.
- [ ] Loading and quote success use polite live regions; new blocking errors are announced appropriately.
- [ ] Color is never the only carrier of status or validation meaning.
- [ ] Loading, empty, populated, saving, saved, validation, failure, blocked, unsupported, stale-response, and material-change states are implemented and testable.
- [ ] Reduced-motion preferences are respected.

## Playwright UI Assertions

The phase browser suite must include explicit assertions for the contracts below at representative desktop and mobile viewports.

### Admin Density and Mobile Parity

- At 1280px, assert the admin page has no horizontal document overflow and every standard table row is at least 48px high; rows with secondary text are at least 56px high.
- Assert aligned trailing action controls occupy stable columns across parcel profiles, destination rules, US adjustments, and assignments.
- At 390px, assert each desktop table has transformed into disclosure or stacked label-value rows and that fees, default/fallback state, effective profile, associated profile/rule, adjustment type, first-item amount, additional-item amount, status, and essential actions remain visible or available in the expanded row.
- Assert every mobile interactive target used by these flows has a bounding box of at least 44×44px.

### Sticky Sheet Actions

- At 390×844px, open each create/edit Sheet, scroll its form body to the end, and assert the sticky header and contextual dismissal/save footer remain visible inside the viewport without overlapping fields or safe-area padding.
- Assert the footer uses the contextual dismissal label for the active flow and never renders generic dismissal copy.

### Checkout Layout Stability

- Measure the destination/quote region before and during initial quoting and re-quoting; assert the reserved quote-status area remains at least 56px high and downstream checkout content does not shift upward or jump to another scroll position.
- Select the US and assert state/territory and postal fields appear in DOM and keyboard order without clearing country or unrelated checkout values and without automatically moving focus.
- Assert unsupported shipping renders no `$0`, `0 ₫`, `Free`, or selectable shipping method and preserves all destination values.

### Request Ordering and Resolution

- Intercept two quote requests, resolve the newer response first and the older response last, and assert only the newer response controls the visible fee, method, totals, errors, and material-change dialog.
- With zero defaults, assert checkout succeeds when an exact or attached profile/rule resolves shipping; assert the recoverable unsupported state appears only when exact, attached, and active-default resolution all fail.
- After selecting or replacing a default, assert exactly one active default is returned and rendered, with no intermediate zero-default or two-default UI state.

### Focus Restoration

- Close each Sheet after save, clean dismissal, and confirmed discard; assert focus returns to the invoking add/edit control or the updated row's primary action when the original control no longer exists.
- In `QuoteDiffDialog`, choose `Review destination` and assert focus returns to the first destination field relevant to the change. Close the dialog without accepting and assert the proposed quote is not committed.
- Complete destructive and set-default confirmations and assert focus returns to a logical surviving row action or section action.

## UI-SPEC COMPLETE
