import {submitCheckoutInputSchema, type SubmitCheckoutInput} from './schemas';

export {submitCheckoutInputSchema};

export type SubmitCheckoutResult =
  | {
      status: 'success';
      orderId: string;
      orderNumber: string;
      reservationExpiresAt: string;
      guestAccessToken: string | null;
    }
  | {
      status: 'invalid' | 'stale' | 'conflict' | 'retryable' | 'error';
      code: string;
    };

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

function mapRpcResult(value: unknown): SubmitCheckoutResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {status: 'error', code: 'checkout_submit_failed'};
  }
  const row = value as Record<string, unknown>;
  if (
    row.status === 'success' &&
    typeof row.orderId === 'string' &&
    typeof row.orderNumber === 'string' &&
    typeof row.reservationExpiresAt === 'string'
  ) {
    return {
      status: 'success',
      orderId: row.orderId,
      orderNumber: row.orderNumber,
      reservationExpiresAt: row.reservationExpiresAt,
      guestAccessToken: typeof row.guestAccessToken === 'string' ? row.guestAccessToken : null
    };
  }
  if (
    (row.status === 'invalid' || row.status === 'stale' || row.status === 'conflict' || row.status === 'retryable') &&
    typeof row.code === 'string'
  ) {
    return {status: row.status, code: row.code};
  }
  return {status: 'error', code: 'checkout_submit_failed'};
}

export async function submitCheckout(input: SubmitCheckoutInput, client: RpcClient): Promise<SubmitCheckoutResult> {
  const parsed = submitCheckoutInputSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_checkout_submit'};
  }

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const {data, error} = await client.rpc('submit_checkout', {p_payload: parsed.data});
    if (error) {
      return {status: 'error', code: 'checkout_submit_failed'};
    }
    const result = mapRpcResult(data);
    if (result.status !== 'retryable') {
      return result;
    }
  }

  return {status: 'retryable', code: 'retryable_checkout_conflict'};
}
