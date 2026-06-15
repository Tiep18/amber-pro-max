import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const transitionContract = readFileSync('supabase/tests/database/04_payment_transitions.test.sql', 'utf8');
const modelContract = readFileSync('supabase/tests/database/04_payment_model.test.sql', 'utf8');
const rlsContract = readFileSync('supabase/tests/database/04_payment_rls_audit.test.sql', 'utf8');

const requiredRaceContracts = [
  /duplicate provider events/i,
  /recheck|webhook/i,
  /expiry-race|expiry uses the same transition/i,
  /late completed capture/i,
  /VietQR admin confirmation/i,
  /VietQR admin rejection/i,
  /single-outcome/i,
  /monotonic/i
];

for (const contract of requiredRaceContracts) {
  assert.match(transitionContract, contract);
}

assert.match(modelContract, /payment_transitions_transition_key_unique_idx/);
assert.match(modelContract, /payment_events_provider_event_unique_idx/);
assert.match(modelContract, /paid_gate_opened_at/);
assert.match(modelContract, /digital_fulfillment_status/);
assert.match(modelContract, /physical_fulfillment_status/);
assert.match(rlsContract, /anon cannot execute arbitrary payment transitions/i);
assert.match(rlsContract, /audit rows are append-only/i);

const futureRuntimeHarnesses = [
  'src/payments/transitions.ts',
  'supabase/migrations/20260615040000_trusted_payments_orders.sql'
];

if (futureRuntimeHarnesses.some((file) => existsSync(file))) {
  const source = futureRuntimeHarnesses.filter((file) => existsSync(file)).map((file) => readFileSync(file, 'utf8')).join('\n');
  assert.match(source, /for update|rpc\('apply_payment_transition'|apply_payment_transition/i);
  assert.match(source, /duplicate|transition_key|provider_event_id/i);
  assert.match(source, /finalized_at|release_reason|inventory_effect/i);
}

console.log('payment concurrency contract seams verified');
