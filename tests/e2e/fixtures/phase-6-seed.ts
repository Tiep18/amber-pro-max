import {createHash} from 'node:crypto';
import {createConfirmedUser, deleteUser, rest, type E2EUser} from './authenticated-users';

type ProductFixture = {
  id: string;
  enSlug: string;
  viSlug: string;
  title: string;
};

export type Phase6Seed = {
  customer: E2EUser;
  admin: E2EUser;
  products: {
    review: ProductFixture;
    wishlistAvailable: ProductFixture;
    wishlistUnavailable: ProductFixture;
    physical: ProductFixture;
  };
  newsletterReaderEmail: string;
  unsubscribeTokens: {
    valid: string;
    expired: string;
    invalid: string;
  };
};

const createdUsers: E2EUser[] = [];
const createdProductIds: string[] = [];
const createdOrderIds: string[] = [];
const createdEmails: string[] = [];

function suffix() {
  return `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function tokenHash(rawToken: string) {
  return createHash('sha256').update(rawToken, 'utf8').digest('hex');
}

async function createProduct({
  type = 'pdf_pattern',
  title,
  enSlug,
  viSlug,
  offers
}: {
  type?: 'pdf_pattern' | 'physical_finished';
  title: string;
  enSlug: string;
  viSlug: string;
  offers: Array<{market_code: 'intl' | 'vn'; currency_code: 'USD' | 'VND'; price_minor: number; enabled: boolean}>;
}): Promise<ProductFixture> {
  const productResponse = await rest('products', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({product_type: type, status: 'published', published_at: new Date().toISOString()})
  });
  const [{id}] = (await productResponse.json()) as Array<{id: string}>;
  createdProductIds.push(id);

  await rest('product_translations', {
    method: 'POST',
    body: JSON.stringify([
      {
        product_id: id,
        locale: 'en',
        title,
        description: `${title} fixture for Phase 6.`,
        specifications: {difficulty: 'easy'},
        slug: enSlug,
        seo_title: title,
        seo_description: `${title} fixture.`
      },
      {
        product_id: id,
        locale: 'vi',
        title: `Mau ${title}`,
        description: `Du lieu kiem thu ${title}.`,
        specifications: {difficulty: 'easy'},
        slug: viSlug,
        seo_title: `Mau ${title}`,
        seo_description: `Du lieu kiem thu ${title}.`
      }
    ])
  });

  await rest('product_market_offers', {
    method: 'POST',
    body: JSON.stringify(offers.map((offer) => ({product_id: id, ...offer})))
  });

  if (type === 'physical_finished') {
    await rest('inventory_records', {
      method: 'POST',
      body: JSON.stringify({product_id: id, quantity_on_hand: 3})
    });
  }

  return {id, enSlug, viSlug, title};
}

async function seedAddress(userId: string) {
  await rest('customer_shipping_addresses', {
    method: 'POST',
    body: JSON.stringify([
      {
        user_id: userId,
        label: 'Vietnam studio',
        recipient_name: 'Taylor Customer',
        phone_number: '+15551234567',
        country_code: 'VN',
        locality: 'Ho Chi Minh City',
        region: null,
        address_line_1: '2 Nguyen Hue',
        address_line_2: null,
        postal_code: null,
        is_default: true
      },
      {
        user_id: userId,
        label: 'US home',
        recipient_name: 'Taylor Customer',
        phone_number: '+15557654321',
        country_code: 'US',
        locality: 'San Francisco',
        region: 'CA',
        address_line_1: '123 Market Street',
        address_line_2: null,
        postal_code: '94105',
        is_default: false
      }
    ])
  });
}

async function seedWishlist(userId: string, products: Phase6Seed['products']) {
  await rest('wishlist_items', {
    method: 'POST',
    body: JSON.stringify([
      {user_id: userId, product_id: products.wishlistAvailable.id},
      {user_id: userId, product_id: products.wishlistUnavailable.id}
    ])
  });
}

async function seedPaidReviewEligibility(user: E2EUser, product: ProductFixture) {
  const now = new Date().toISOString();
  const orderResponse = await rest('checkout_orders', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({
      owner_user_id: user.id,
      contact_email: user.email,
      locale: 'en',
      market: 'intl',
      currency_code: 'USD',
      status: 'paid',
      order_status: 'paid',
      payment_status: 'paid',
      paid_gate_status: 'open',
      paid_at: now,
      payment_terminal_at: now,
      digital_fulfillment_status: 'eligible',
      physical_fulfillment_status: 'not_required',
      payment_intent: 'paypal_intent',
      subtotal_minor: 2400,
      total_minor: 2400,
      accepted_quote_hash: `phase6-${product.id}`,
      quote_snapshot: {fixture: 'phase-6-review'},
      cart_snapshot: [{productId: product.id}],
      idempotency_actor: user.id,
      idempotency_key: `phase6-${product.id}`,
      reservation_expires_at: new Date(Date.now() + 60_000).toISOString()
    })
  });
  const [{id: orderId}] = (await orderResponse.json()) as Array<{id: string}>;
  createdOrderIds.push(orderId);

  await rest('checkout_order_lines', {
    method: 'POST',
    body: JSON.stringify({
      order_id: orderId,
      product_id: product.id,
      line_id: 'phase6-review-line',
      product_title: product.title,
      fulfillment_type: 'digital',
      market: 'intl',
      currency_code: 'USD',
      quantity: 1,
      unit_price_minor: 2400,
      line_subtotal_minor: 2400,
      quote_line_snapshot: {fixture: 'phase-6-review-line'}
    })
  });

  await rest(`payments?order_id=eq.${orderId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: 'paid',
      paid_gate_opened_at: now,
      paid_at: now,
      terminal_at: now,
      digital_fulfillment_status: 'eligible',
      physical_fulfillment_status: 'not_required',
      sanitized_evidence: {fixture: 'phase-6-review-paid'}
    })
  });
}

async function seedAdminReviews(admin: E2EUser, product: ProductFixture) {
  const approvedAuthor = await createConfirmedUser('customer');
  const replyWorkflowAuthor = await createConfirmedUser('customer');
  createdUsers.push(approvedAuthor, replyWorkflowAuthor);

  await rest('product_reviews', {
    method: 'POST',
    body: JSON.stringify({
      user_id: admin.id,
      product_id: product.id,
      rating: 4,
      title: 'Pending moderation fixture',
      body: 'Waiting for admin review.',
      status: 'pending'
    })
  });
  const approved = await rest('product_reviews', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({
      user_id: approvedAuthor.id,
      product_id: product.id,
      rating: 5,
      title: 'Approved fixture review',
      body: 'Visible public review.',
      status: 'approved',
      approved_at: new Date().toISOString()
    })
  });
  const [{id: approvedReviewId}] = (await approved.json()) as Array<{id: string}>;

  await rest('product_reviews', {
    method: 'POST',
    body: JSON.stringify({
      user_id: replyWorkflowAuthor.id,
      product_id: product.id,
      rating: 5,
      title: 'Reply workflow fixture',
      body: 'Ready for admin reply workflow.',
      status: 'approved',
      approved_at: new Date().toISOString()
    })
  });

  await rest('review_admin_replies', {
    method: 'POST',
    body: JSON.stringify({
      review_id: approvedReviewId,
      admin_user_id: admin.id,
      body: 'Thank you for your review.'
    })
  });
}

async function seedNewsletter() {
  const readerEmail = `reader-${suffix()}@example.test`;
  const newsletterEmail = `newsletter-${suffix()}@example.test`;
  createdEmails.push(readerEmail, newsletterEmail);

  await rest('newsletter_subscribers', {
    method: 'POST',
    body: JSON.stringify([
      {normalized_email: readerEmail, status: 'subscribed', latest_locale: 'en', latest_market: 'intl'},
      {normalized_email: newsletterEmail, status: 'subscribed', latest_locale: 'en', latest_market: 'intl'}
    ])
  });
  await rest('newsletter_consent_events', {
    method: 'POST',
    body: JSON.stringify([
      {
        normalized_email: readerEmail,
        event_type: 'subscribe',
        consent_source: 'footer',
        locale: 'en',
        market: 'intl',
        ip_hash: tokenHash('phase6-ip'),
        user_agent_hash: tokenHash('phase6-agent')
      },
      {
        normalized_email: newsletterEmail,
        event_type: 'subscribe',
        consent_source: 'footer',
        locale: 'en',
        market: 'intl',
        ip_hash: null,
        user_agent_hash: null
      }
    ])
  });

  const valid = tokenHash(`valid-${suffix()}`);
  const expired = tokenHash(`expired-${suffix()}`);
  const invalid = tokenHash(`invalid-${suffix()}`);
  await rest('newsletter_unsubscribe_tokens', {
    method: 'POST',
    body: JSON.stringify([
      {
        normalized_email: newsletterEmail,
        token_hash: tokenHash(valid),
        expires_at: new Date(Date.now() + 86_400_000).toISOString(),
        created_at: new Date(Date.now() - 60_000).toISOString()
      },
      {
        normalized_email: newsletterEmail,
        token_hash: tokenHash(expired),
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        created_at: new Date(Date.now() - 172_800_000).toISOString()
      }
    ])
  });

  return {readerEmail, tokens: {valid, expired, invalid}};
}

export async function seedPhase6Data(): Promise<Phase6Seed> {
  const customer = await createConfirmedUser('customer');
  const admin = await createConfirmedUser('admin');
  createdUsers.push(customer, admin);

  const id = suffix();
  const products = {
    review: await createProduct({
      title: `Phase 6 review bear ${id}`,
      enSlug: `phase-6-review-bear-${id}`,
      viSlug: `gau-danh-gia-phase-6-${id}`,
      offers: [
        {market_code: 'intl', currency_code: 'USD', enabled: true, price_minor: 2400},
        {market_code: 'vn', currency_code: 'VND', enabled: true, price_minor: 520000}
      ]
    }),
    wishlistAvailable: await createProduct({
      title: `Phase 6 wishlist bunny ${id}`,
      enSlug: `phase-6-wishlist-bunny-${id}`,
      viSlug: `tho-yeu-thich-phase-6-${id}`,
      offers: [{market_code: 'intl', currency_code: 'USD', enabled: true, price_minor: 1800}]
    }),
    wishlistUnavailable: await createProduct({
      title: `Phase 6 VN-only doll ${id}`,
      enSlug: `phase-6-vn-only-doll-${id}`,
      viSlug: `bup-be-vn-phase-6-${id}`,
      offers: [{market_code: 'vn', currency_code: 'VND', enabled: true, price_minor: 410000}]
    }),
    physical: await createProduct({
      type: 'physical_finished',
      title: `Phase 6 checkout fox ${id}`,
      enSlug: `phase-6-checkout-fox-${id}`,
      viSlug: `cao-thanh-toan-phase-6-${id}`,
      offers: [{market_code: 'intl', currency_code: 'USD', enabled: true, price_minor: 3200}]
    })
  };

  await seedAddress(customer.id);
  await seedWishlist(customer.id, products);
  await seedPaidReviewEligibility(customer, products.review);
  await seedAdminReviews(admin, products.review);
  const newsletter = await seedNewsletter();

  return {
    customer,
    admin,
    products,
    newsletterReaderEmail: newsletter.readerEmail,
    unsubscribeTokens: newsletter.tokens
  };
}

async function safeRest(path: string, init?: RequestInit) {
  try {
    await rest(path, init);
  } catch {
    // Some commerce rows are intentionally append-only; failed teardown must not mask test failures.
  }
}

async function safeDeleteUser(userId: string) {
  try {
    await deleteUser(userId);
  } catch {
    // A later db reset removes any leftover auth fixtures.
  }
}

export async function cleanupPhase6Data() {
  for (const email of createdEmails.splice(0)) {
    await safeRest(`newsletter_subscribers?normalized_email=eq.${encodeURIComponent(email)}`, {method: 'DELETE'});
  }
  for (const orderId of createdOrderIds.splice(0)) {
    await safeRest(`checkout_orders?id=eq.${orderId}`, {method: 'DELETE'});
  }
  for (const productId of createdProductIds.splice(0)) {
    await safeRest(`products?id=eq.${productId}`, {method: 'DELETE'});
  }
  for (const user of createdUsers.splice(0)) {
    await safeDeleteUser(user.id);
  }
}
