import {runMonitoredAction} from '@/operations/monitoring';
import {paymentTransitionInputSchema, paymentTransitionResultSchema} from './schemas';
import type {PaymentTransitionInput, PaymentTransitionResult} from './types';

type RpcClient = {
  rpc: (fn: 'apply_payment_transition', args: {p_payload: Record<string, unknown>}) => Promise<{data: unknown; error: unknown}>;
};

function mapPaymentTransitionResult(value: unknown): PaymentTransitionResult {
  const parsed = paymentTransitionResultSchema.safeParse(value);
  if (parsed.success) {
    return parsed.data;
  }

  return {status: 'error', code: 'payment_transition_failed'};
}

async function recordPaymentTransitionFailure(input: PaymentTransitionInput & {code: string}) {
  return runMonitoredAction({
    area: 'payment',
    action: 'apply_payment_transition',
    errorCode: input.code,
    summary: 'Payment transition RPC failed',
    errorResult: {status: 'error', code: 'payment_transition_failed'} as const,
    shouldRecordResult: () => true,
    facts: {
      transition: `${input.source}:${input.targetStatus}`,
      ...(input.paymentId ? {paymentId: input.paymentId} : {}),
      ...(input.orderNumber ? {orderNumber: input.orderNumber} : {}),
      ...(input.providerEventId ? {providerEventId: input.providerEventId} : {}),
      ...(typeof input.amountMinor === 'number' ? {amountValue: input.amountMinor} : {}),
      ...(input.currencyCode ? {currency: input.currencyCode} : {})
    },
    operation: async () => ({status: 'error', code: 'payment_transition_failed'}) as const
  });
}

export async function applyPaymentTransition(
  input: PaymentTransitionInput,
  client: RpcClient
): Promise<PaymentTransitionResult> {
  const parsed = paymentTransitionInputSchema.safeParse(input);
  if (!parsed.success) {
    return {status: 'invalid', code: 'invalid_payment_transition'};
  }

  const {data, error} = await client.rpc('apply_payment_transition', {p_payload: parsed.data});
  if (error) {
    return recordPaymentTransitionFailure({...parsed.data, code: 'payment_transition_failed'});
  }

  return mapPaymentTransitionResult(data);
}
