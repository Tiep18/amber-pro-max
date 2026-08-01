import {randomBytes} from 'node:crypto';
import {hashGuestOrderAccessToken} from '@/payments/guest-access';
import {consumeGuestOrderToken, findGuestOrderToken, isGuestOrderTokenUsable} from './guest-order-tokens';

type QueryClient = {
  from: (table: string) => unknown;
};

type OrderPaymentStatusRow = {
  order_id: string;
  order_number: string;
  owner_user_id: string | null;
  payment_status: string | null;
  reservation_expires_at: string | null;
};

export type RedeemGuestOrderReopenResult =
  | {status: 'granted'; orderNumber: string; rawSecret: string; paid: boolean; reservationExpiresAt: string | null}
  | {status: 'denied'};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function asOrderPaymentStatusRow(value: unknown): OrderPaymentStatusRow | null {
  if (!isRecord(value) || typeof value.order_id !== 'string' || typeof value.order_number !== 'string') {
    return null;
  }
  return {
    order_id: value.order_id,
    order_number: value.order_number,
    owner_user_id: typeof value.owner_user_id === 'string' ? value.owner_user_id : null,
    payment_status: typeof value.payment_status === 'string' ? value.payment_status : null,
    reservation_expires_at: typeof value.reservation_expires_at === 'string' ? value.reservation_expires_at : null
  };
}

async function findOrderPaymentStatusByNumber(client: QueryClient, orderNumber: string) {
  const query = client.from('order_payment_statuses') as {
    select: (columns: string) => {
      eq: (column: string, value: string) => {maybeSingle: () => Promise<{data: unknown; error: unknown}>};
    };
  };
  const {data, error} = await query
    .select('order_id,order_number,owner_user_id,payment_status,reservation_expires_at')
    .eq('order_number', orderNumber)
    .maybeSingle();
  if (error) {
    return null;
  }
  return asOrderPaymentStatusRow(data);
}

/**
 * A `reopen_order` token only proves the caller controls the order's contact
 * inbox — it is a distinct secret from the checkout `guest_secret_hash`
 * (which is never persisted in a recoverable form). Redemption therefore
 * mints and stores a *new* guest secret rather than trying to reissue the
 * original one, mirroring how the checkout submit flow first establishes it.
 */
export async function redeemGuestOrderReopenToken(
  {orderNumber, rawToken}: {orderNumber: string; rawToken: string},
  client: QueryClient
): Promise<RedeemGuestOrderReopenResult> {
  const normalizedOrderNumber = orderNumber.trim().toUpperCase();
  if (!normalizedOrderNumber || !rawToken) {
    return {status: 'denied'};
  }

  const order = await findOrderPaymentStatusByNumber(client, normalizedOrderNumber);
  if (!order || order.owner_user_id) {
    // Claimed orders are recovered through the signed-in claim flow instead.
    return {status: 'denied'};
  }

  const token = await findGuestOrderToken({
    client,
    orderId: order.order_id,
    rawToken,
    purpose: 'reopen_order'
  });
  if (!isGuestOrderTokenUsable(token)) {
    return {status: 'denied'};
  }

  const consumed = await consumeGuestOrderToken({client, tokenId: token!.id});
  if (!consumed) {
    return {status: 'denied'};
  }

  const rawSecret = randomBytes(32).toString('base64url');
  const table = client.from('checkout_orders') as {
    update: (value: Record<string, unknown>) => {eq: (column: string, value: string) => Promise<{data: unknown; error: unknown}>};
  };
  const {error} = await table
    .update({guest_secret_hash: hashGuestOrderAccessToken(rawSecret), updated_at: new Date().toISOString()})
    .eq('id', order.order_id);
  if (error) {
    return {status: 'denied'};
  }

  return {
    status: 'granted',
    orderNumber: order.order_number,
    rawSecret,
    paid: order.payment_status === 'paid',
    reservationExpiresAt: order.reservation_expires_at
  };
}
