import {randomBytes} from 'node:crypto';
import {hashGuestOrderAccessToken} from '@/payments/guest-access';

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

export type RedeemGuestOrderReopenResult =
  | {status: 'granted'; orderNumber: string; rawSecret: string; paid: boolean; reservationExpiresAt: string | null}
  | {status: 'denied'};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * A `reopen_order` token only proves the caller controls the order's contact
 * inbox — it is a distinct secret from the checkout `guest_secret_hash`
 * (which is never persisted in a recoverable form). Redemption therefore
 * mints and stores a *new* guest secret rather than trying to reissue the
 * original one, mirroring how the checkout submit flow first establishes it.
 *
 * Validation, single-shot consumption and secret rotation all happen inside
 * `public.redeem_guest_order_reopen_token`, so two concurrent clicks on the
 * same emailed link cannot both be granted access, and a failure partway
 * through cannot burn the token without handing back a usable secret.
 */
export async function redeemGuestOrderReopenToken(
  {orderNumber, rawToken}: {orderNumber: string; rawToken: string},
  client: RpcClient
): Promise<RedeemGuestOrderReopenResult> {
  const normalizedOrderNumber = orderNumber.trim().toUpperCase();
  if (!normalizedOrderNumber || !rawToken) {
    return {status: 'denied'};
  }

  const rawSecret = randomBytes(32).toString('base64url');
  const {data, error} = await client.rpc('redeem_guest_order_reopen_token', {
    p_order_number: normalizedOrderNumber,
    p_token_hash: hashGuestOrderAccessToken(rawToken),
    p_new_guest_secret_hash: hashGuestOrderAccessToken(rawSecret)
  });

  if (error || !isRecord(data) || data.status !== 'granted' || typeof data.orderNumber !== 'string') {
    return {status: 'denied'};
  }

  return {
    status: 'granted',
    orderNumber: data.orderNumber,
    rawSecret,
    paid: data.paid === true,
    reservationExpiresAt:
      typeof data.reservationExpiresAt === 'string' ? data.reservationExpiresAt : null
  };
}
