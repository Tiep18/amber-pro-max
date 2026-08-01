'use server';

import {createSupabaseServerClient} from '@/lib/supabase/server';
import {runMonitoredAction} from '@/operations/monitoring';
import {getGuestOrderAccessHashFromServer} from '@/payments/guest-access';

export type DeclareVietQrTransferResult = {
  status: 'recorded' | 'unchanged' | 'not_eligible' | 'forbidden' | 'error';
  code?: string;
};

type RpcClient = {
  rpc: (fn: string, args: Record<string, unknown>) => Promise<{data: unknown; error: unknown}>;
};

function isKnownStatus(value: unknown): value is DeclareVietQrTransferResult['status'] {
  return value === 'recorded' || value === 'unchanged' || value === 'not_eligible' || value === 'forbidden';
}

export async function declareVietQrTransferAction(orderNumber: string): Promise<DeclareVietQrTransferResult> {
  const normalizedOrderNumber = orderNumber.trim();
  if (!normalizedOrderNumber) {
    return {status: 'forbidden'};
  }

  return runMonitoredAction({
    area: 'payment',
    action: 'vietqr_declare',
    errorCode: 'vietqr_declare_failed',
    summary: 'VietQR customer transfer declaration failed',
    facts: {orderNumber: normalizedOrderNumber},
    errorResult: {status: 'error', code: 'vietqr_declare_failed'} as const,
    operation: async () => {
      const client = (await createSupabaseServerClient()) as unknown as RpcClient;
      const guestSecretHash = await getGuestOrderAccessHashFromServer(normalizedOrderNumber);
      const {data, error} = await client.rpc('declare_vietqr_transfer', {
        p_order_number: normalizedOrderNumber,
        p_guest_secret_hash: guestSecretHash
      });
      if (error || !data || typeof data !== 'object' || Array.isArray(data)) {
        throw new Error('vietqr_declare_rpc_failed');
      }
      const status = (data as Record<string, unknown>).status;
      if (!isKnownStatus(status)) {
        throw new Error('vietqr_declare_unexpected_result');
      }
      return {status};
    }
  });
}
