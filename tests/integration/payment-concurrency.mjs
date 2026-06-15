import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55431';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const serviceHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json'
};

const adapterSource = readFileSync('src/payments/transitions.ts', 'utf8');
assert.match(adapterSource, /applyPaymentTransition/);
assert.match(adapterSource, /rpc\('apply_payment_transition'/);
assert.match(adapterSource, /paymentTransitionInputSchema/);

function suffix() {
  return `${Date.now()}${Math.random().toString(16).slice(2, 8)}`;
}

async function rest(path, init = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {...serviceHeaders, ...init.headers}
  });
  if (!response.ok) {
    throw new Error(`${path}: ${response.status} ${await response.text()}`);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

async function insertRow(table, body) {
  const rows = await rest(table, {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify(body)
  });
  return rows[0];
}

async function selectOne(path) {
  const rows = await rest(path);
  assert.equal(rows.length, 1, `${path} should return one row`);
  return rows[0];
}

async function selectMany(path) {
  return rest(path);
}

async function applyPaymentTransition(input) {
  return rest('rpc/apply_payment_transition', {
    method: 'POST',
    body: JSON.stringify({p_payload: input})
  });
}

async function createPhysicalOrder({provider = 'paypal', quantity = 2, stock = 5, expired = false} = {}) {
  const id = suffix();
  const product = await insertRow('products', {
    product_type: 'physical_finished',
    status: 'published',
    published_at: new Date().toISOString()
  });

  const inventory = await insertRow('inventory_records', {product_id: product.id, quantity_on_hand: stock});

  const market = provider === 'paypal' ? 'intl' : 'vn';
  const currencyCode = provider === 'paypal' ? 'USD' : 'VND';
  const paymentIntent = provider === 'paypal' ? 'paypal_intent' : 'vietqr_intent';
  const deadline = new Date(Date.now() + (expired ? -60_000 : 900_000)).toISOString();
  const amountMinor = currencyCode === 'USD' ? 4250 : 250000;

  const order = await insertRow('checkout_orders', {
    order_number: `ATB-RACE-${id}`,
    contact_email: `race-${id}@example.test`,
    locale: 'en',
    market,
    currency_code: currencyCode,
    status: 'pending_payment',
    payment_intent: paymentIntent,
    subtotal_minor: amountMinor,
    discount_minor: 0,
    shipping_minor: 0,
    total_minor: amountMinor,
    accepted_quote_hash: `hash-${id}`,
    quote_snapshot: {status: 'ready', hash: `hash-${id}`, lines: []},
    cart_snapshot: [],
    idempotency_actor: `race-${id}`,
    idempotency_key: `idem-${id}`,
    reservation_expires_at: deadline,
    guest_secret_hash: '0'.repeat(64)
  });

  const line = await insertRow('checkout_order_lines', {
    order_id: order.id,
    product_id: product.id,
    line_id: `line-${id}`,
    product_title: 'Race test bear',
    fulfillment_type: 'physical',
    market,
    currency_code: currencyCode,
    quantity,
    unit_price_minor: Math.floor(amountMinor / quantity),
    line_subtotal_minor: amountMinor,
    discount_allocation_minor: 0,
    shipping_allocation_minor: 0,
    quote_line_snapshot: {lineId: `line-${id}`, fulfillmentType: 'physical'}
  });

  const reservation = await insertRow('checkout_inventory_reservations', {
    order_id: order.id,
    order_line_id: line.id,
    inventory_record_id: inventory.id,
    quantity_reserved: quantity,
    expires_at: deadline
  });

  const payment = await selectOne(`payments?select=id,status,amount_minor,currency_code&order_id=eq.${order.id}`);

  return {order, payment, product, inventory, reservation, amountMinor, currencyCode, quantity, stock};
}

async function fetchOutcome(orderId, inventoryId) {
  const payment = await selectOne(`payments?select=id,status,paid_gate_opened_at,review_reason&order_id=eq.${orderId}`);
  const inventory = await selectOne(`inventory_records?select=quantity_on_hand&id=eq.${inventoryId}`);
  const reservations = await selectMany(
    `checkout_inventory_reservations?select=status,finalized_at,released_at,release_reason&order_id=eq.${orderId}`
  );
  const transitions = await selectMany(
    `payment_transitions?select=result,to_status,inventory_effect&payment_id=eq.${payment.id}`
  );
  return {payment, inventory, reservations, transitions};
}

async function duplicatePaidRace() {
  const fixture = await createPhysicalOrder();
  const providerEventId = `WH-RACE-PAID-${suffix()}`;
  const [first, second] = await Promise.all([
    applyPaymentTransition(
      {
        transitionKey: `paid-a-${suffix()}`,
        source: 'paypal_webhook',
        targetStatus: 'paid',
        providerEventId,
        eventType: 'PAYMENT.CAPTURE.COMPLETED',
        orderNumber: fixture.order.order_number,
        amountMinor: fixture.amountMinor,
        currencyCode: fixture.currencyCode
      },
      undefined
    ),
    applyPaymentTransition(
      {
        transitionKey: `paid-b-${suffix()}`,
        source: 'paypal_webhook',
        targetStatus: 'paid',
        providerEventId,
        eventType: 'PAYMENT.CAPTURE.COMPLETED',
        orderNumber: fixture.order.order_number,
        amountMinor: fixture.amountMinor,
        currencyCode: fixture.currencyCode
      },
      undefined
    )
  ]);

  const statuses = [first.status, second.status].sort();
  assert.equal(statuses.includes('applied'), true);
  assert.equal(statuses.some((status) => status === 'duplicate' || status === 'stale'), true);

  const outcome = await fetchOutcome(fixture.order.id, fixture.inventory.id);
  assert.equal(outcome.payment.status, 'paid');
  assert.equal(outcome.inventory.quantity_on_hand, fixture.stock - fixture.quantity);
  assert.equal(outcome.reservations.filter((row) => row.status === 'consumed').length, 1);
  assert.equal(outcome.transitions.filter((row) => row.inventory_effect === 'finalized').length, 1);
}

async function expiryPaidRace() {
  const fixture = await createPhysicalOrder({expired: true});
  const [expired, paid] = await Promise.all([
    applyPaymentTransition(
      {
        transitionKey: `expiry-${suffix()}`,
        source: 'reservation_expiry_job',
        targetStatus: 'expired',
        orderNumber: fixture.order.order_number,
        releaseReason: 'reservation_deadline_expired'
      },
      undefined
    ),
    applyPaymentTransition(
      {
        transitionKey: `late-paid-${suffix()}`,
        source: 'paypal_webhook',
        targetStatus: 'paid',
        providerEventId: `WH-LATE-${suffix()}`,
        eventType: 'PAYMENT.CAPTURE.COMPLETED',
        orderNumber: fixture.order.order_number,
        amountMinor: fixture.amountMinor,
        currencyCode: fixture.currencyCode
      },
      undefined
    )
  ]);

  assert.ok(['applied', 'review_required', 'stale'].includes(expired.status));
  assert.ok(['applied', 'review_required', 'stale'].includes(paid.status));

  const outcome = await fetchOutcome(fixture.order.id, fixture.inventory.id);
  assert.notEqual(outcome.payment.status, 'paid');
  assert.equal(outcome.inventory.quantity_on_hand, fixture.stock);
  assert.equal(outcome.reservations.some((row) => row.status === 'expired'), true);
}

async function vietqrConfirmRace() {
  const fixture = await createPhysicalOrder({provider: 'vietqr', quantity: 1, stock: 4});
  const [first, second] = await Promise.all([
    applyPaymentTransition(
      {
        transitionKey: `vietqr-confirm-a-${suffix()}`,
        source: 'vietqr_admin',
        targetStatus: 'paid',
        orderNumber: fixture.order.order_number,
        bankReference: `BANK-${suffix()}`,
        receivedAmountMinor: fixture.amountMinor,
        receivedAt: new Date().toISOString()
      },
      undefined
    ),
    applyPaymentTransition(
      {
        transitionKey: `vietqr-confirm-b-${suffix()}`,
        source: 'vietqr_admin',
        targetStatus: 'paid',
        orderNumber: fixture.order.order_number,
        bankReference: `BANK-${suffix()}`,
        receivedAmountMinor: fixture.amountMinor,
        receivedAt: new Date().toISOString()
      },
      undefined
    )
  ]);

  assert.deepEqual([first.status, second.status].sort(), ['applied', 'stale']);
  const outcome = await fetchOutcome(fixture.order.id, fixture.inventory.id);
  assert.equal(outcome.payment.status, 'paid');
  assert.equal(outcome.inventory.quantity_on_hand, fixture.stock - fixture.quantity);
  assert.equal(outcome.transitions.filter((row) => row.inventory_effect === 'finalized').length, 1);
}

async function vietqrConfirmRejectRace() {
  const fixture = await createPhysicalOrder({provider: 'vietqr', quantity: 1, stock: 3});
  const [confirm, reject] = await Promise.all([
    applyPaymentTransition(
      {
        transitionKey: `vietqr-confirm-${suffix()}`,
        source: 'vietqr_admin',
        targetStatus: 'paid',
        orderNumber: fixture.order.order_number,
        bankReference: `BANK-${suffix()}`,
        receivedAmountMinor: fixture.amountMinor,
        receivedAt: new Date().toISOString()
      },
      undefined
    ),
    applyPaymentTransition(
      {
        transitionKey: `vietqr-reject-${suffix()}`,
        source: 'vietqr_admin',
        targetStatus: 'rejected',
        orderNumber: fixture.order.order_number,
        releaseReason: 'wrong_amount_or_reference'
      },
      undefined
    )
  ]);

  assert.ok(['applied', 'review_required', 'stale'].includes(confirm.status));
  assert.ok(['applied', 'stale'].includes(reject.status));

  const outcome = await fetchOutcome(fixture.order.id, fixture.inventory.id);
  const finalizedCount = outcome.transitions.filter((row) => row.inventory_effect === 'finalized').length;
  const releasedCount = outcome.transitions.filter((row) => row.inventory_effect === 'released').length;
  assert.equal(finalizedCount + releasedCount, 1);
}

await duplicatePaidRace();
await expiryPaidRace();
await vietqrConfirmRace();
await vietqrConfirmRejectRace();
console.log('payment concurrency exact-once scenarios passed');
