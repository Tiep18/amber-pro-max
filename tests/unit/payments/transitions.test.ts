import {beforeEach, describe, expect, it, vi} from 'vitest';

const {recordOperationalFailureMock} = vi.hoisted(() => ({
  recordOperationalFailureMock: vi.fn(async () => ({
    status: 'recorded',
    errorId: '76000000-0000-4000-8000-000000000001'
  }))
}));

vi.mock('@/operations/errors', () => ({recordOperationalFailure: recordOperationalFailureMock}));

import {applyPaymentTransition} from '@/payments/transitions';

describe('payment transition operational recording', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('records transition RPC failures without exposing raw payload details', async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: {message: 'private transition rpc failed with raw_payload and token'}
    }));

    await expect(
      applyPaymentTransition(
        {
          transitionKey: 'paypal-capture:provider-order-private',
          source: 'paypal_recheck',
          targetStatus: 'paid',
          paymentId: '11111111-1111-4111-8111-111111111111',
          orderNumber: 'ATB-20260708-0001',
          providerEventId: 'WH-private-provider-event',
          amountMinor: 1200,
          currencyCode: 'USD',
          sanitizedFacts: {
            providerOrderId: 'secret-provider-order'
          }
        },
        {rpc}
      )
    ).resolves.toEqual({status: 'error', code: 'payment_transition_failed'});

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'payment',
        severity: 'error',
        errorCode: 'payment_transition_failed',
        summary: 'Payment transition RPC failed',
        facts: expect.objectContaining({
          action: 'apply_payment_transition',
          transition: 'paypal_recheck:paid',
          paymentId: '11111111-1111-4111-8111-111111111111',
          orderNumber: 'ATB-20260708-0001',
          providerEventId: 'WH-private-provider-event',
          amountValue: 1200,
          currency: 'USD',
          code: 'payment_transition_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(
      /provider-order-private|secret-provider-order|raw_payload|token|private transition/i
    );
  });

  it('keeps transition error states when operational recording fails', async () => {
    recordOperationalFailureMock.mockRejectedValueOnce(new Error('operational table unavailable'));
    const rpc = vi.fn(async () => ({
      data: null,
      error: {message: 'transition rpc failed'}
    }));

    await expect(
      applyPaymentTransition(
        {
          transitionKey: 'paypal-capture:provider-order-private',
          source: 'paypal_recheck',
          targetStatus: 'paid',
          paymentId: '11111111-1111-4111-8111-111111111111',
          orderNumber: 'ATB-20260708-0001',
          providerEventId: 'WH-private-provider-event',
          amountMinor: 1200,
          currencyCode: 'USD'
        },
        {rpc}
      )
    ).resolves.toEqual({status: 'error', code: 'payment_transition_failed'});
  });
});
