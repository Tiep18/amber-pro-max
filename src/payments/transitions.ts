import {recordOperationalFailure} from '@/operations/errors';
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
  await recordOperationalFailure({
    area: 'payment',
    severity: 'error',
    errorCode: input.code,
    summary: 'Payment transition RPC failed',
    facts: {
      action: 'apply_payment_transition',
      transition: `${input.source}:${input.targetStatus}`,
      paymentId: input.paymentId,
      orderNumber: input.orderNumber,
      providerEventId: input.providerEventId,
      amountValue: input.amountMinor,
      currency: input.currencyCode,
      code: input.code
    }
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
    await recordPaymentTransitionFailure({...parsed.data, code: 'payment_transition_failed'});
    return {status: 'error', code: 'payment_transition_failed'};
  }

  return mapPaymentTransitionResult(data);
}
