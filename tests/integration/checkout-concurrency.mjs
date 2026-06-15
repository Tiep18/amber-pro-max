import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const checkoutMigration = readFileSync('supabase/migrations/20260615032000_checkout_orders_reservations.sql', 'utf8');
const exceptionMigration = readFileSync('supabase/migrations/20260615033000_market_exceptions.sql', 'utf8');

assert.match(checkoutMigration, /checkout_orders_idempotency_unique_idx/);
assert.match(checkoutMigration, /for update/i);
assert.match(checkoutMigration, /checkout_inventory_reservations/);
assert.match(checkoutMigration, /serialization_failure|deadlock_detected/);

assert.match(exceptionMigration, /market_exception_grants/);
assert.match(exceptionMigration, /token_hash text not null unique/);
assert.match(exceptionMigration, /status text not null default 'active'/);
assert.match(exceptionMigration, /validate_market_exception_grant/);
assert.match(exceptionMigration, /for update/i);
assert.match(exceptionMigration, /status = 'used'/);
assert.match(exceptionMigration, /consumed_order_id = order_row\.id/);

console.log('checkout concurrency boundaries verified');
