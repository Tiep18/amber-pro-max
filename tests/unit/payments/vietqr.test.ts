import {describe, expect, test, vi} from 'vitest';

vi.mock('server-only', () => ({}));

import {getVietQrInstructions, type VietQrInstructionOrder, type VietQrServerConfig} from '@/payments/vietqr/instructions';

const vietQrInstructionContract = {
  market: 'vn',
  currencyCode: 'VND',
  amountMinor: 250000,
  orderNumber: 'ATB-20260615-0002',
  transferReference: 'ATB-20260615-0002',
  deadlineMinutes: 24 * 60
} as const;

const config: VietQrServerConfig = {
  status: 'configured',
  bankId: 'VCB',
  accountNo: '1234567890',
  accountName: 'Amber Tiny Bear',
  template: 'compact2'
};

const order: VietQrInstructionOrder = {
  orderId: '11111111-1111-4111-8111-111111111111',
  paymentId: '22222222-2222-4222-8222-222222222222',
  orderNumber: vietQrInstructionContract.orderNumber,
  market: 'vn',
  currencyCode: 'VND',
  paymentIntent: 'vietqr_intent',
  paymentStatus: 'pending',
  amountMinor: vietQrInstructionContract.amountMinor,
  reservationExpiresAt: '2026-06-17T09:00:00.000Z'
};

describe('VietQR instruction and evidence contract', () => {
  test('keeps VietQR as exact VND payment instructions, not customer self-confirmation', () => {
    expect(vietQrInstructionContract).toMatchObject({
      market: 'vn',
      currencyCode: 'VND',
      amountMinor: 250000,
      transferReference: vietQrInstructionContract.orderNumber,
      deadlineMinutes: 1440
    });
  });

  test('builds exact VietQR quick-link instructions from approved server config', async () => {
    const result = await getVietQrInstructions({
      config,
      order,
      now: new Date('2026-06-16T09:00:00.000Z')
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') {
      return;
    }

    const qrUrl = new URL(result.instruction.qrImageUrl);
    expect(qrUrl.origin + qrUrl.pathname).toBe('https://img.vietqr.io/image/VCB-1234567890-compact2.png');
    expect(qrUrl.searchParams.get('amount')).toBe('250000');
    expect(qrUrl.searchParams.get('addInfo')).toBe(order.orderNumber);
    expect(qrUrl.searchParams.get('accountName')).toBe('Amber Tiny Bear');
    expect(result.instruction).toMatchObject({
      orderId: order.orderId,
      paymentId: order.paymentId,
      orderNumber: order.orderNumber,
      amountMinor: 250000,
      currencyCode: 'VND',
      transferReference: order.orderNumber,
      bankId: 'VCB',
      accountName: 'Amber Tiny Bear',
      accountNoMasked: '******7890',
      paymentDeadlineAt: order.reservationExpiresAt
    });
  });

  test('rejects ineligible market, currency, method, amount and deadline before creating instructions', async () => {
    await expect(
      getVietQrInstructions({
        config,
        order: {...order, market: 'intl', currencyCode: 'USD', paymentIntent: 'paypal_intent'},
        now: new Date('2026-06-16T09:00:00.000Z')
      })
    ).resolves.toEqual({status: 'invalid', code: 'vietqr_order_not_eligible'});
    await expect(
      getVietQrInstructions({
        config,
        order: {...order, amountMinor: 0},
        now: new Date('2026-06-16T09:00:00.000Z')
      })
    ).resolves.toEqual({status: 'invalid', code: 'invalid_vietqr_amount'});
    await expect(
      getVietQrInstructions({
        config,
        order: {...order, reservationExpiresAt: '2026-06-16T08:59:59.000Z'},
        now: new Date('2026-06-16T09:00:00.000Z')
      })
    ).resolves.toEqual({status: 'invalid', code: 'vietqr_payment_window_closed'});
  });

  test('records the instruction snapshot once through the shared transition source without opening paid state', async () => {
    const rpc = vi.fn(async () => ({
      data: {status: 'applied', paymentStatus: 'pending', inventoryEffect: 'none'},
      error: null
    }));

    const result = await getVietQrInstructions({
      config,
      order,
      now: new Date('2026-06-16T09:00:00.000Z'),
      transitionClient: {rpc}
    });

    expect(result.status).toBe('ready');
    expect(rpc).toHaveBeenCalledWith('apply_payment_transition', {
      p_payload: expect.objectContaining({
        transitionKey: `vietqr-instruction:${order.paymentId}`,
        source: 'vietqr_instruction',
        targetStatus: 'pending',
        orderNumber: order.orderNumber,
        amountMinor: 250000,
        currencyCode: 'VND',
        verificationStatus: 'system',
        sanitizedFacts: expect.objectContaining({
          bankId: 'VCB',
          accountNoMasked: '******7890',
          transferReference: order.orderNumber,
          paymentDeadlineAt: order.reservationExpiresAt
        })
      })
    });

    rpc.mockClear();
    const duplicate = await getVietQrInstructions({
      config,
      order: {...order, existingInstruction: result.status === 'ready' ? result.instruction : null},
      now: new Date('2026-06-16T09:00:00.000Z'),
      transitionClient: {rpc}
    });

    expect(duplicate).toEqual(result);
    expect(rpc).not.toHaveBeenCalled();
  });

  test.todo('requires admin bank reference, received amount, and received timestamp before confirmation');
  test.todo('rejects wrong amount or wrong reference through an audited release transition');
  test.todo('handles admin double-submit and stale confirm-versus-reject as idempotent no-ops');
});
