# Atomic Physical Fulfillment Email Design

## Goal

Make an admin physical-fulfillment mutation, its append-only event, and any
required `physical_shipped` transactional-email outbox row one PostgreSQL
transaction. A failed event or email enqueue must leave the fulfillment row
unchanged so the admin can safely retry with the same expected state and
version.

This change uses the existing Supabase Postgres database and Next.js admin
action. It adds no queue, worker, cron, dependency, or paid service.

## Current Failure Mode

`updatePhysicalFulfillment` currently performs three independent PostgREST
requests:

1. update `physical_fulfillments`;
2. insert `physical_fulfillment_events`;
3. when the requested status is `shipped`, insert
   `transactional_email_outbox`.

If step 2 or 3 fails, step 1 is already committed. The action returns
`physical_update_failed`, but a retry with the original expected state or
version returns `physical_state_changed`. In the shipped case, the order can
therefore remain shipped without a durable customer-email intent.

## Chosen Approach

Add one public, security-definer PostgreSQL RPC for the complete mutation. The
RPC authenticates the caller as an admin, locks the target fulfillment row,
validates optimistic-concurrency and transition rules, derives order and
recipient facts from the database, then performs the update, event insert, and
conditional outbox insert before returning.

The Next.js action retains Zod validation and safe operational error reporting,
but delegates persistence to this RPC through the authenticated Supabase server
client. The current service-role multi-request path is removed.

### Alternatives rejected

- A status-change trigger would make email creation atomic, but would obscure
  actor attribution and spread one admin command across implicit triggers.
- Application-level compensation or a repair job would retain the partial
  commit window and add operational complexity without guaranteeing delivery.

## Database Contract

Create `public.update_physical_fulfillment(p_payload jsonb) returns jsonb` in a
forward-only migration. The function is `security definer`, uses a fixed
`search_path`, and returns bounded status objects.

Access rules:

- revoke execution from `public` and `anon`;
- grant execution only to `authenticated`;
- return `{"status":"forbidden"}` unless `private.is_admin()` is true;
- use `auth.uid()` as the fulfillment-event `actor_id`.

The payload contains only:

- `orderId`;
- `expectedStatus` and `expectedVersion`;
- target `status`;
- optional `carrier`, `trackingNumber`, `trackingUrl`, and admin `note`.

The RPC must not accept recipient email, locale, order number, timestamps,
fulfillment row ID, actor ID, or an email payload from the browser.

## Transaction Flow

Within one function invocation:

1. Validate payload shape, UUID, integer version, bounded strings, supported
   statuses, and HTTPS-only tracking URLs.
2. Select the physical fulfillment by `order_id` with `FOR UPDATE` and join its
   `checkout_orders` row to obtain authoritative `order_number`,
   `contact_email`, and `locale`.
3. Return `not_found` if no row exists, `stale` if status or version differs,
   or `invalid` for a disallowed transition.
4. Update status, normalized optional fields, database-authored timestamps, and
   `version = version + 1`.
5. Insert one `physical_fulfillment_events` row with the target status, safe
   carrier/tracking-presence metadata, caller identity, and no customer PII or
   admin note.
6. If the requested status is `shipped`, insert one `physical_shipped` outbox
   row using the order's authoritative email, locale, order number, and the
   normalized carrier/tracking facts.
7. Return the new status and version only after every statement succeeds.

Any SQL error aborts the function transaction. PostgreSQL therefore rolls back
the fulfillment update and event if the outbox insert fails, and rolls back the
fulfillment update if event insertion fails.

Same-state updates remain allowed to preserve the current admin behavior,
including a new shipped email intent when a successful mutation targets
`shipped`. Optimistic version checks prevent an HTTP retry of the same command
from creating a duplicate intent.

## Application Adapter

`updatePhysicalFulfillment` continues to expose the existing public result
union. It validates input, calls only `update_physical_fulfillment`, strictly
maps the RPC response, and records a bounded `physical_update_failed` failure
for transport errors or malformed results.

The server action still calls `requireAdmin`, then creates a cookie-backed
Supabase server client so the RPC receives the authenticated admin JWT. The
browser-provided order number may remain only for post-action route
revalidation; it does not cross the database mutation boundary or influence
the email.

Result mapping:

- `updated` -> current success result with status and version;
- `stale` -> `physical_state_changed`;
- `invalid` -> `invalid_physical_transition` or `invalid_tracking_url`;
- `not_found` -> `physical_fulfillment_not_found`;
- `forbidden` and unexpected/transport results -> safe existing error result.

## Security and Privacy

- Database authorization is enforced inside the mutation, not only by the
  server action.
- Customer email, locale, and order number come from locked database rows.
- No raw provider error, email address, tracking value, or admin note enters
  operational-error facts.
- Existing safe-payload and safe-metadata triggers remain active for the event
  and outbox inserts.
- Existing RLS and table grants remain unchanged; clients gain only the narrow
  RPC execution capability.

## Verification

Use TDD at both adapter and database boundaries.

- Unit tests require exactly one RPC call and no direct table mutation.
- Unit tests cover success, stale, invalid, not-found, forbidden, transport
  error, and malformed response mappings.
- pgTAP covers admin-only execution, transition/version guards, authoritative
  outbox facts, event actor attribution, and non-shipped behavior.
- A pgTAP failpoint trigger deliberately rejects the shipped outbox insert. The
  test asserts the RPC throws and that fulfillment status/version, event count,
  and outbox count all remain unchanged.
- Security tests prohibit reintroducing direct multi-table writes in the
  application adapter and require the RPC's admin gate and restricted grants.
- Full lint, typecheck, unit, database, generated-type, production-build, and
  security gates must pass before completion.

## Out of Scope

- Guest order claim atomicity.
- Manual download resend audit/outbox atomicity.
- Changes to payment confirmation, entitlement granting, email rendering,
  retry-token derivation, Resend behavior, Supabase Cron, or physical carrier
  automation.
