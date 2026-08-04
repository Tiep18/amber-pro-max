import {execFile} from 'node:child_process';
import {createHash} from 'node:crypto';
import {promisify} from 'node:util';

import {
  createConfirmedUser,
  deleteUser,
  rest,
  supabaseUrl,
  type E2EUser
} from './authenticated-users';

export type Phase10PaymentState =
  | 'pending-paypal'
  | 'pending-vietqr'
  | 'verifying'
  | 'review-required'
  | 'paid-digital'
  | 'paid-physical'
  | 'paid-mixed'
  | 'failed'
  | 'cancelled'
  | 'rejected'
  | 'expired'
  | 'partially-refunded'
  | 'refunded';

type SeededProduct = {
  id: string;
  enSlug: string;
  viSlug: string;
  title: string;
};

export type Phase10OrderFixture = {
  orderId: string;
  orderNumber: string;
  state: Phase10PaymentState;
};

export type Phase10CommerceSeed = {
  customer: E2EUser;
  products: {
    digital: SeededProduct;
    physical: SeededProduct;
  };
  orders: Record<Phase10PaymentState, Phase10OrderFixture>;
};

const createdOrderIds: string[] = [];
const createdProductIds: string[] = [];
const createdProfileIds: string[] = [];
const createdUsers: E2EUser[] = [];
const execFileAsync = promisify(execFile);
const dockerExecutable = process.platform === 'win32' ? 'docker.exe' : 'docker';
const localSupabaseDbContainer = 'supabase_db_Test_GSD';
const localSupabaseProject = 'Test_GSD';

function suffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function hashToken(token: string) {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

async function createProduct(input: {
  type: 'pdf_pattern' | 'physical_finished';
  title: string;
  enSlug: string;
  viSlug: string;
}): Promise<SeededProduct> {
  const response = await rest('products', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({
      product_type: input.type,
      status: 'published',
      published_at: new Date().toISOString()
    })
  });
  const [{id}] = (await response.json()) as Array<{id: string}>;
  createdProductIds.push(id);

  await rest('product_translations', {
    method: 'POST',
    body: JSON.stringify([
      {
        product_id: id,
        locale: 'en',
        title: input.title,
        description: `${input.title} deterministic Phase 10 fixture.`,
        specifications: {fixture: 'phase-10'},
        slug: input.enSlug,
        seo_title: input.title,
        seo_description: `${input.title} fixture.`
      },
      {
        product_id: id,
        locale: 'vi',
        title: `Mẫu ${input.title}`,
        description: `Dữ liệu kiểm thử ${input.title}.`,
        specifications: {fixture: 'phase-10'},
        slug: input.viSlug,
        seo_title: `Mẫu ${input.title}`,
        seo_description: `Dữ liệu kiểm thử ${input.title}.`
      }
    ])
  });

  await rest('product_market_offers', {
    method: 'POST',
    body: JSON.stringify([
      {product_id: id, market_code: 'intl', currency_code: 'USD', price_minor: 2400, enabled: true},
      {product_id: id, market_code: 'vn', currency_code: 'VND', price_minor: 520000, enabled: true}
    ])
  });

  if (input.type === 'physical_finished') {
    await rest('inventory_records', {
      method: 'POST',
      body: JSON.stringify({product_id: id, quantity_on_hand: 100})
    });
  }

  return {id, enSlug: input.enSlug, viSlug: input.viSlug, title: input.title};
}

async function seedShipping(productId: string) {
  const response = await rest('shipping_profiles', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({name: `Phase 10 shipping ${suffix()}`})
  });
  const [{id: profileId}] = (await response.json()) as Array<{id: string}>;
  createdProfileIds.push(profileId);

  await rest('shipping_rules', {
    method: 'POST',
    body: JSON.stringify([
      {
        profile_id: profileId,
        country_code: 'VN',
        currency_code: 'VND',
        first_item_fee_minor: 30000,
        additional_item_fee_minor: 10000
      },
      {
        profile_id: profileId,
        country_code: 'US',
        currency_code: 'USD',
        first_item_fee_minor: 750,
        additional_item_fee_minor: 225
      }
    ])
  });
  await rest('product_shipping_profiles', {
    method: 'POST',
    body: JSON.stringify({product_id: productId, profile_id: profileId})
  });
}

function stateFacts(state: Phase10PaymentState) {
  const paypal = state !== 'pending-vietqr';
  const paid = state.startsWith('paid-') || state === 'partially-refunded' || state === 'refunded';
  const status =
    state === 'pending-paypal' || state === 'pending-vietqr'
      ? 'pending'
      : state === 'verifying'
        ? 'verifying'
        : state === 'review-required'
          ? 'review_required'
          : state.startsWith('paid-')
            ? 'paid'
            : state.replaceAll('-', '_');
  const refundStatus = state === 'partially-refunded' ? 'partially_refunded' : state === 'refunded' ? 'refunded' : 'not_refunded';
  const orderStatus = status === 'pending' ? 'pending_payment' : status === 'verifying' ? 'verifying_payment' : status;
  const projectedPaymentStatus = status === 'pending' ? 'awaiting_payment' : status === 'verifying' ? 'verifying_payment' : status;

  return {
    market: paypal ? ('intl' as const) : ('vn' as const),
    currencyCode: paypal ? ('USD' as const) : ('VND' as const),
    paymentIntent: paypal ? ('paypal_intent' as const) : ('vietqr_intent' as const),
    provider: paypal ? ('paypal' as const) : ('vietqr' as const),
    status,
    orderStatus,
    projectedPaymentStatus,
    paid,
    refundStatus
  };
}

async function seedOrder({
  state,
  owner,
  digital,
  physical
}: {
  state: Phase10PaymentState;
  owner: E2EUser;
  digital: SeededProduct;
  physical: SeededProduct;
}): Promise<Phase10OrderFixture> {
  const facts = stateFacts(state);
  const fixtureId = suffix();
  const orderNumber = `ATB-P10-${state.toUpperCase()}-${fixtureId}`.slice(0, 80);
  const totalMinor = facts.currencyCode === 'USD' ? 2400 : 520000;
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  const response = await rest('checkout_orders', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({
      order_number: orderNumber,
      owner_user_id: owner.id,
      contact_email: owner.email,
      locale: 'en',
      market: facts.market,
      currency_code: facts.currencyCode,
      status: facts.orderStatus,
      order_status: facts.orderStatus,
      payment_status: facts.projectedPaymentStatus,
      paid_gate_status: facts.paid ? 'open' : facts.status === 'review_required' ? 'review_required' : 'locked',
      paid_at: facts.paid ? now : null,
      payment_terminal_at: facts.paid || !['pending', 'verifying', 'review_required'].includes(facts.status) ? now : null,
      digital_fulfillment_status: facts.paid ? 'eligible' : 'blocked',
      physical_fulfillment_status: facts.paid ? 'awaiting_fulfillment' : 'blocked',
      refund_status: facts.refundStatus,
      refunded_amount_minor: state === 'partially-refunded' ? Math.floor(totalMinor / 2) : state === 'refunded' ? totalMinor : 0,
      review_reason: state === 'review-required' ? 'late_payment_detected' : null,
      payment_intent: facts.paymentIntent,
      subtotal_minor: totalMinor,
      discount_minor: 0,
      shipping_minor: 0,
      total_minor: totalMinor,
      accepted_quote_hash: `phase-10-${fixtureId}`,
      quote_snapshot: {fixture: 'phase-10', state},
      cart_snapshot: [{productId: digital.id, variantId: null, quantity: 1}],
      idempotency_actor: owner.id,
      idempotency_key: `phase-10-${fixtureId}`,
      reservation_expires_at: expiresAt,
      shipping_address: state === 'paid-physical' || state === 'paid-mixed'
        ? {
            recipientName: 'Taylor Customer',
            phoneNumber: '+15551234567',
            countryCode: 'US',
            locality: 'San Francisco',
            region: 'CA',
            addressLine1: '123 Market Street',
            addressLine2: null,
            postalCode: '94105'
          }
        : null
    })
  });
  const [{id: orderId}] = (await response.json()) as Array<{id: string}>;
  createdOrderIds.push(orderId);

  const lineProducts = state === 'paid-mixed'
    ? [digital, physical]
    : state === 'paid-physical'
      ? [physical]
      : [digital];
  await rest('checkout_order_lines', {
    method: 'POST',
    body: JSON.stringify(
      lineProducts.map((product, index) => ({
        order_id: orderId,
        product_id: product.id,
        line_id: `phase-10-${state}-${index}`,
        product_title: product.title,
        fulfillment_type: product.id === physical.id ? 'physical' : 'digital',
        market: facts.market,
        currency_code: facts.currencyCode,
        quantity: 1,
        unit_price_minor: totalMinor,
        line_subtotal_minor: totalMinor,
        quote_line_snapshot: {fixture: 'phase-10-line', state}
      }))
    )
  });

  await rest(`payments?order_id=eq.${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: facts.status,
      paid_gate_opened_at: facts.paid ? now : null,
      paid_at: facts.paid ? now : null,
      terminal_at: facts.paid || !['pending', 'verifying', 'review_required'].includes(facts.status) ? now : null,
      digital_fulfillment_status: facts.paid ? 'eligible' : 'blocked',
      physical_fulfillment_status: facts.paid ? 'awaiting_fulfillment' : 'blocked',
      refund_status: facts.refundStatus,
      refunded_amount_minor: state === 'partially-refunded' ? Math.floor(totalMinor / 2) : state === 'refunded' ? totalMinor : 0,
      review_reason: state === 'review-required' ? 'late_payment_detected' : null,
      provider_order_id: facts.provider === 'paypal' ? `P10-PAYPAL-${fixtureId}` : null,
      provider_reference: facts.provider === 'vietqr' ? orderNumber : null,
      sanitized_evidence: {fixture: 'phase-10', provider: facts.provider, state}
    })
  });

  return {orderId, orderNumber, state};
}

export async function seedPhase10Commerce(): Promise<Phase10CommerceSeed> {
  const customer = await createConfirmedUser('customer');
  createdUsers.push(customer);
  const id = suffix();
  const digital = await createProduct({
    type: 'pdf_pattern',
    title: `Phase 10 digital bear ${id}`,
    enSlug: `phase-10-digital-bear-${id}`,
    viSlug: `gau-so-phase-10-${id}`
  });
  const physical = await createProduct({
    type: 'physical_finished',
    title: `Phase 10 handmade fox ${id}`,
    enSlug: `phase-10-handmade-fox-${id}`,
    viSlug: `cao-thu-cong-phase-10-${id}`
  });
  await seedShipping(physical.id);

  const states: Phase10PaymentState[] = [
    'pending-paypal',
    'pending-vietqr',
    'verifying',
    'review-required',
    'paid-digital',
    'paid-physical',
    'paid-mixed',
    'failed',
    'cancelled',
    'rejected',
    'expired',
    'partially-refunded',
    'refunded'
  ];
  const entries: Array<readonly [Phase10PaymentState, Phase10OrderFixture]> = [];
  for (const state of states) {
    entries.push([state, await seedOrder({state, owner: customer, digital, physical})] as const);
  }

  return {customer, products: {digital, physical}, orders: Object.fromEntries(entries) as Phase10CommerceSeed['orders']};
}

function assertLoopbackSupabase() {
  const target = new URL(supabaseUrl);
  if (target.protocol !== 'http:' || !new Set(['127.0.0.1', 'localhost', '[::1]']).has(target.hostname)) {
    throw new Error(`Phase 10 privileged cleanup requires loopback Supabase; received ${target.origin}`);
  }
}

function sqlText(value: string) {
  return `'${value.replaceAll("'", "''")}'`;
}

async function deleteProtectedOrders(orderIds: string[]) {
  if (orderIds.length === 0) return;
  assertLoopbackSupabase();
  const {stdout: projectLabel} = await execFileAsync(
    dockerExecutable,
    ['inspect', '--format', '{{ index .Config.Labels "com.supabase.cli.project" }}', localSupabaseDbContainer],
    {windowsHide: true}
  );
  if (projectLabel.trim() !== localSupabaseProject) {
    throw new Error(`Phase 10 cleanup refused container ${localSupabaseDbContainer}.`);
  }
  const ids = orderIds.map(sqlText).join(', ');
  await execFileAsync(
    dockerExecutable,
    [
      'exec',
      localSupabaseDbContainer,
      'psql',
      '--set',
      'ON_ERROR_STOP=1',
      '--username',
      'postgres',
      '--dbname',
      'postgres',
      '--command',
      [
        'begin;',
        'alter table public.commerce_audit_events disable trigger commerce_audit_events_append_only;',
        `delete from public.commerce_audit_events where order_id in (${ids});`,
        `delete from public.checkout_orders where id in (${ids});`,
        'alter table public.commerce_audit_events enable trigger commerce_audit_events_append_only;',
        'commit;'
      ].join('\n')
    ],
    {windowsHide: true}
  );
}

export async function cleanupPhase10Commerce() {
  const orderIds = createdOrderIds.splice(0);
  const productIds = createdProductIds.splice(0);
  const profileIds = createdProfileIds.splice(0);
  const users = createdUsers.splice(0);

  await deleteProtectedOrders(orderIds);
  for (const productId of productIds) await rest(`products?id=eq.${productId}`, {method: 'DELETE'});
  for (const profileId of profileIds) await rest(`shipping_profiles?id=eq.${profileId}`, {method: 'DELETE'});
  for (const user of users) await deleteUser(user.id);
}

export function phase10GuestCookie(orderNumber: string, rawToken: string) {
  const normalized = orderNumber.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '-').slice(0, 80);
  return {
    name: `atb_guest_order_${normalized}`,
    value: rawToken,
    hash: hashToken(rawToken)
  };
}
