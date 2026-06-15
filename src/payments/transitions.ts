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
    return {status: 'error', code: 'payment_transition_failed'};
  }

  return mapPaymentTransitionResult(data);
}
