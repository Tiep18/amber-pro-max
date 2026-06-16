import {describe, expect, test, vi} from 'vitest';

vi.mock('server-only', () => ({}));

import {
  buildVietQrConfirmTransition,
  buildVietQrRejectTransition,
  compareVietQrEvidence,
  type VietQrExpectedPayment
} from '@/payments/vietqr/evidence';
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

const expectedPayment: VietQrExpectedPayment = {
  orderId: order.orderId,
  paymentId: order.paymentId,
  orderNumber: order.orderNumber,
  provider: 'vietqr',
  paymentStatus: 'pending',
  amountMinor: order.amountMinor,
  currencyCode: 'VND',
  transferReference: order.orderNumber,
  paymentDeadlineAt: order.reservationExpiresAt
};

function createActionClient({
  detail = {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    paymentId: order.paymentId,
    provider: 'vietqr',
    paymentStatus: 'pending',
    amountMinor: order.amountMinor,
    currencyCode: 'VND',
    reservationExpiresAt: order.reservationExpiresAt,
    vietQrEvidence: {
      transferReference: order.orderNumber,
      expectedAmountMinor: order.amountMinor,
      paymentDeadlineAt: order.reservationExpiresAt,
      actionAvailable: true,
      latestEvidence: null
    },
    timeline: []
  },
  transition = {status: 'applied', paymentStatus: 'paid', inventoryEffect: 'finalized'}
}: {
  detail?: Record<string, unknown>;
  transition?: Record<string, unknown>;
} = {}) {
  return {
    detail,
    rpc: vi.fn(async (_fn: string, _args: {p_payload: Record<string, unknown>}) => ({data: transition, error: null}))
  };
}

async function importAdminActions({
  client = createActionClient(),
  requireAdmin = vi.fn(async () => ({id: 'admin-user'}))
}: {
  client?: ReturnType<typeof createActionClient>;
  requireAdmin?: ReturnType<typeof vi.fn>;
} = {}) {
  vi.resetModules();
  vi.doMock('server-only', () => ({}));
  vi.doMock('next/cache', () => ({revalidatePath: vi.fn()}));
  vi.doMock('@/auth/guards', () => ({requireAdmin}));
  vi.doMock('@/payments/queries', () => ({
    createAdminOrderQueryClient: vi.fn(async () => client),
    getAdminOrderDetail: vi.fn(async () => ({status: 'success', order: client.detail}))
  }));
  vi.doMock('@/payments/transitions', () => ({
    applyPaymentTransition: vi.fn(async (input: unknown, rpcClient: {rpc: typeof client.rpc}) => {
      const {data} = await rpcClient.rpc('apply_payment_transition', {p_payload: input as Record<string, unknown>});
      return data;
    })
  }));
  const actions = await import('@/payments/admin-actions');
  const transitions = await import('@/payments/transitions');
  return {
    confirmVietQrPaymentAction: actions.confirmVietQrPaymentAction as (formData: FormData) => Promise<unknown>,
    rejectVietQrPaymentAction: actions.rejectVietQrPaymentAction as (formData: FormData) => Promise<unknown>,
    applyPaymentTransition: vi.mocked(transitions.applyPaymentTransition),
    requireAdmin,
    client
  };
}

function confirmForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set('orderId', order.orderId);
  formData.set('bankReference', order.orderNumber);
  formData.set('receivedAmountMinor', String(order.amountMinor));
  formData.set('receivedAt', '2026-06-16T09:05:00.000Z');
  formData.set('idempotencyKey', 'admin-confirm-atb-20260615-0002');
  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }
  return formData;
}

function rejectForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set('orderId', order.orderId);
  formData.set('reason', 'wrong_amount');
  formData.set('note', 'Customer transferred the wrong amount.');
  formData.set('idempotencyKey', 'admin-reject-atb-20260615-0002');
  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }
  return formData;
}

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

    expect(duplicate).toEqual({
      status: 'ready',
      instruction: result.status === 'ready' ? result.instruction : null
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  test('requires exact bank reference, received amount and timestamp before confirmation', () => {
    const comparison = compareVietQrEvidence(expectedPayment, {
      bankReference: order.orderNumber,
      receivedAmountMinor: order.amountMinor,
      receivedAt: '2026-06-16T09:05:00.000Z',
      idempotencyKey: 'admin-confirm-atb-20260615-0002'
    });

    expect(comparison).toEqual({status: 'matched'});
    expect(
      buildVietQrConfirmTransition({
        expected: expectedPayment,
        evidence: {
          bankReference: order.orderNumber,
          receivedAmountMinor: order.amountMinor,
          receivedAt: '2026-06-16T09:05:00.000Z',
          idempotencyKey: 'admin-confirm-atb-20260615-0002'
        }
      })
    ).toMatchObject({
      transitionKey: 'vietqr-confirm:admin-confirm-atb-20260615-0002',
      source: 'vietqr_admin',
      targetStatus: 'paid',
      orderNumber: order.orderNumber,
      bankReference: order.orderNumber,
      receivedAmountMinor: order.amountMinor,
      receivedAt: '2026-06-16T09:05:00.000Z',
      sanitizedFacts: expect.objectContaining({
        transferReference: order.orderNumber,
        evidenceMatched: true
      })
    });
  });

  test('rejects wrong amount or wrong reference through an audited release transition', () => {
    expect(
      compareVietQrEvidence(expectedPayment, {
        bankReference: 'WRONG-REFERENCE',
        receivedAmountMinor: order.amountMinor,
        receivedAt: '2026-06-16T09:05:00.000Z',
        idempotencyKey: 'admin-confirm-atb-20260615-0002'
      })
    ).toEqual({status: 'mismatch', code: 'vietqr_reference_mismatch'});
    expect(
      compareVietQrEvidence(expectedPayment, {
        bankReference: order.orderNumber,
        receivedAmountMinor: order.amountMinor - 1,
        receivedAt: '2026-06-16T09:05:00.000Z',
        idempotencyKey: 'admin-confirm-atb-20260615-0002'
      })
    ).toEqual({status: 'mismatch', code: 'vietqr_amount_mismatch'});
    expect(
      buildVietQrRejectTransition({
        expected: expectedPayment,
        rejection: {
          reason: 'wrong_amount',
          note: 'Customer transferred the wrong amount.',
          idempotencyKey: 'admin-reject-atb-20260615-0002'
        }
      })
    ).toMatchObject({
      transitionKey: 'vietqr-reject:admin-reject-atb-20260615-0002',
      source: 'vietqr_admin',
      targetStatus: 'rejected',
      orderNumber: order.orderNumber,
      releaseReason: 'vietqr_wrong_amount',
      sanitizedFacts: expect.objectContaining({
        rejectionReason: 'wrong_amount',
        noteProvided: true
      })
    });
  });

  test('admin actions authorize before parsing and delegate exact confirmation to the shared transition command', async () => {
    const {confirmVietQrPaymentAction, applyPaymentTransition, requireAdmin, client} = await importAdminActions();

    const result = await confirmVietQrPaymentAction(confirmForm());

    expect(result).toEqual({status: 'confirmed', paymentStatus: 'paid'});
    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(applyPaymentTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'vietqr_admin',
        targetStatus: 'paid',
        orderNumber: order.orderNumber,
        bankReference: order.orderNumber,
        receivedAmountMinor: order.amountMinor
      }),
      client
    );
  });

  test('non-admin, stale and duplicate VietQR actions cannot create repeated or regressive effects', async () => {
    const deniedAdmin = vi.fn(async () => {
      throw new Error('not-admin');
    });
    const deniedClient = createActionClient();
    const denied = await importAdminActions({client: deniedClient, requireAdmin: deniedAdmin});

    await expect(denied.confirmVietQrPaymentAction(confirmForm({receivedAmountMinor: 'not-a-number'}))).rejects.toThrow('not-admin');
    expect(deniedClient.rpc).not.toHaveBeenCalled();

    const stale = await importAdminActions({
      client: createActionClient({
        detail: {
          ...createActionClient().detail,
          paymentStatus: 'paid',
          vietQrEvidence: {
            transferReference: order.orderNumber,
            expectedAmountMinor: order.amountMinor,
            paymentDeadlineAt: order.reservationExpiresAt,
            actionAvailable: false,
            latestEvidence: null
          }
        }
      })
    });
    await expect(stale.rejectVietQrPaymentAction(rejectForm())).resolves.toEqual({
      status: 'stale',
      code: 'vietqr_action_not_available'
    });

    const duplicate = await importAdminActions({
      client: createActionClient({transition: {status: 'duplicate', paymentStatus: 'paid', inventoryEffect: 'none'}})
    });
    await expect(duplicate.confirmVietQrPaymentAction(confirmForm())).resolves.toEqual({
      status: 'duplicate',
      paymentStatus: 'paid'
    });
  });
});
