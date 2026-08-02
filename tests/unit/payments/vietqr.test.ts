import {beforeEach, describe, expect, test, vi} from 'vitest';

const {recordOperationalFailureMock} = vi.hoisted(() => ({
  recordOperationalFailureMock: vi.fn(async () => ({
    status: 'recorded',
    errorId: '76000000-0000-4000-8000-000000000001'
  }))
}));

vi.mock('server-only', () => ({}));
vi.mock('@/operations/errors', () => ({recordOperationalFailure: recordOperationalFailureMock}));

import {
  buildVietQrConfirmTransition,
  buildVietQrRejectTransition,
  compareVietQrEvidence,
  isVietQrPaymentActionAvailable,
  resolveVietQrActionWindow,
  type VietQrExpectedPayment
} from '@/payments/vietqr/evidence';
import {
  getVietQrInstructions,
  type VietQrInstructionOrder,
  type VietQrServerConfig
} from '@/payments/vietqr/instructions';

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
  reservationExpiresAt: '2099-06-21T09:00:00.000Z'
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
      // The fixture order is still inside its hold, so both decisions are open.
      rejectAvailable: true,
      lateSettlement: false,
      closedReason: null,
      latestEvidence: null
    },
    timeline: []
  },
  transition = { status: 'applied', paymentStatus: 'paid', inventoryEffect: 'finalized' }
}: {
  detail?: Record<string, unknown>;
  transition?: Record<string, unknown>;
} = {}) {
  return {
    detail,
    rpc: vi.fn(async (fn: string, args: { p_payload: Record<string, unknown> }) => {
      void fn;
      void args;
      return { data: transition, error: null };
    })
  };
}

async function importAdminActions({
  client = createActionClient(),
  requireAdmin = vi.fn(async () => ({ id: 'admin-user' })),
  recordOperationalFailure = vi.fn(async () => ({
    status: 'recorded',
    errorId: '76000000-0000-4000-8000-000000000001'
  }))
}: {
  client?: ReturnType<typeof createActionClient>;
  requireAdmin?: ReturnType<typeof vi.fn>;
  recordOperationalFailure?: ReturnType<typeof vi.fn>;
} = {}) {
  vi.resetModules();
  vi.doMock('server-only', () => ({}));
  vi.doMock('next/cache', () => ({ revalidatePath: vi.fn() }));
  vi.doMock('@/auth/guards', () => ({ requireAdmin }));
  vi.doMock('@/payments/queries', () => ({
    createAdminOrderQueryClient: vi.fn(async () => client),
    getAdminOrderDetail: vi.fn(async () => ({ status: 'success', order: client.detail }))
  }));
  vi.doMock('@/payments/transitions', () => ({
    applyPaymentTransition: vi.fn(async (input: unknown, rpcClient: { rpc: typeof client.rpc }) => {
      const { data } = await rpcClient.rpc('apply_payment_transition', {
        p_payload: input as Record<string, unknown>
      });
      return data;
    })
  }));
  vi.doMock('@/fulfillment/email-outbox.server', () => ({
    triggerTransactionalEmailOutboxNow: vi.fn(async () => ({
      status: 'processed',
      claimed: 1,
      sent: 1,
      retry: 0,
      failed: 0
    }))
  }));
  vi.doMock('@/operations/errors', () => ({
    recordOperationalFailure
  }));
  const actions = await import('@/payments/admin-actions');
  const transitions = await import('@/payments/transitions');
  const emailOutbox = await import('@/fulfillment/email-outbox.server');
  return {
    confirmVietQrPaymentAction: actions.confirmVietQrPaymentAction as (
      formData: FormData
    ) => Promise<unknown>,
    rejectVietQrPaymentAction: actions.rejectVietQrPaymentAction as (
      formData: FormData
    ) => Promise<unknown>,
    resolveLatePaymentReviewAction: actions.resolveLatePaymentReviewAction as (
      formData: FormData
    ) => Promise<unknown>,
    applyPaymentTransition: vi.mocked(transitions.applyPaymentTransition),
    triggerTransactionalEmailOutboxNow: vi.mocked(emailOutbox.triggerTransactionalEmailOutboxNow),
    recordOperationalFailure,
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

function reviewResolutionForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set('orderId', order.orderId);
  formData.set('idempotencyKey', 'admin-review-atb-20260615-0002');
  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }
  return formData;
}

// A PayPal order parked at `late_payment_out_of_stock`: the money was verified,
// only the stock was missing. Replaying the capture cannot rescue it.
const reviewBlockedDetail = {
  orderId: order.orderId,
  orderNumber: order.orderNumber,
  paymentId: order.paymentId,
  provider: 'paypal',
  paymentStatus: 'review_required',
  amountMinor: order.amountMinor,
  currencyCode: 'USD',
  reservationExpiresAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
  vietQrEvidence: null,
  timeline: []
};

describe('VietQR instruction and evidence contract', () => {
  beforeEach(() => {
    recordOperationalFailureMock.mockReset();
    recordOperationalFailureMock.mockImplementation(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }));
  });

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
    expect(qrUrl.origin + qrUrl.pathname).toBe(
      'https://img.vietqr.io/image/VCB-1234567890-compact2.png'
    );
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
        order: { ...order, market: 'intl', currencyCode: 'USD', paymentIntent: 'paypal_intent' },
        now: new Date('2026-06-16T09:00:00.000Z')
      })
    ).resolves.toEqual({ status: 'invalid', code: 'vietqr_order_not_eligible' });
    await expect(
      getVietQrInstructions({
        config,
        order: { ...order, amountMinor: 0 },
        now: new Date('2026-06-16T09:00:00.000Z')
      })
    ).resolves.toEqual({ status: 'invalid', code: 'invalid_vietqr_amount' });
    await expect(
      getVietQrInstructions({
        config,
        order: { ...order, reservationExpiresAt: '2026-06-16T08:59:59.000Z' },
        now: new Date('2026-06-16T09:00:00.000Z')
      })
    ).resolves.toEqual({ status: 'invalid', code: 'vietqr_payment_window_closed' });
  });

  test('records the instruction snapshot once through the shared transition source without opening paid state', async () => {
    const rpc = vi.fn(async () => ({
      data: { status: 'applied', paymentStatus: 'pending', inventoryEffect: 'none' },
      error: null
    }));

    const result = await getVietQrInstructions({
      config,
      order,
      now: new Date('2026-06-16T09:00:00.000Z'),
      transitionClient: { rpc }
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
      order: {
        ...order,
        existingInstruction: result.status === 'ready' ? result.instruction : null
      },
      now: new Date('2026-06-16T09:00:00.000Z'),
      transitionClient: { rpc }
    });

    expect(duplicate).toEqual({
      status: 'ready',
      instruction: result.status === 'ready' ? result.instruction : null
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  test('records VietQR instruction snapshot failures without exposing QR or account details', async () => {
    const rpc = vi.fn(async () => ({
      data: null,
      error: {message: 'private vietqr snapshot failed for account 1234567890'}
    }));

    await expect(
      getVietQrInstructions({
        config,
        order,
        now: new Date('2026-06-16T09:00:00.000Z'),
        transitionClient: {rpc}
      })
    ).resolves.toMatchObject({status: 'error', code: 'vietqr_instruction_snapshot_failed'});

    expect(recordOperationalFailureMock).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'payment',
        severity: 'error',
        errorCode: 'vietqr_instruction_snapshot_failed',
        summary: 'VietQR instruction snapshot transition failed',
        facts: expect.objectContaining({
          provider: 'vietqr',
          action: 'instruction_snapshot',
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          paymentId: order.paymentId,
          amountValue: order.amountMinor,
          currency: 'VND',
          code: 'vietqr_instruction_snapshot_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailureMock.mock.calls)).not.toMatch(
      /1234567890|img\.vietqr|accountName|qrImageUrl|private vietqr|token/i
    );
  });

  test('keeps VietQR instruction errors when operational recording fails', async () => {
    recordOperationalFailureMock.mockRejectedValue(new Error('operational table unavailable'));
    const rpc = vi.fn(async () => ({
      data: null,
      error: {message: 'private vietqr snapshot failed'}
    }));

    await expect(
      getVietQrInstructions({
        config,
        order,
        now: new Date('2026-06-16T09:00:00.000Z'),
        transitionClient: {rpc}
      })
    ).resolves.toEqual({status: 'error', code: 'vietqr_instruction_snapshot_failed'});
  });

  test('requires exact bank reference, received amount and timestamp before confirmation', () => {
    const comparison = compareVietQrEvidence(expectedPayment, {
      bankReference: order.orderNumber,
      receivedAmountMinor: order.amountMinor,
      receivedAt: '2026-06-16T09:05:00.000Z',
      idempotencyKey: 'admin-confirm-atb-20260615-0002'
    });

    expect(comparison).toEqual({ status: 'matched' });
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
    ).toEqual({ status: 'mismatch', code: 'vietqr_reference_mismatch' });
    expect(
      compareVietQrEvidence(expectedPayment, {
        bankReference: order.orderNumber,
        receivedAmountMinor: order.amountMinor - 1,
        receivedAt: '2026-06-16T09:05:00.000Z',
        idempotencyKey: 'admin-confirm-atb-20260615-0002'
      })
    ).toEqual({ status: 'mismatch', code: 'vietqr_amount_mismatch' });
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

  test('a transfer reconciled after the hold lapsed can still be settled, within the window', () => {
    // The 24h hold expiring does not make a bank transfer unreal. A shop that
    // reconciles its statement once a day could previously never accept one:
    // both the confirm and reject buttons were gated on a future deadline.
    const deadline = '2026-06-16T09:00:00.000Z';
    const expired: VietQrExpectedPayment = {
      ...expectedPayment,
      paymentStatus: 'expired',
      paymentDeadlineAt: deadline
    };

    expect(
      resolveVietQrActionWindow(
        {...expectedPayment, paymentDeadlineAt: deadline},
        new Date('2026-06-16T08:00:00.000Z')
      )
    ).toEqual({status: 'open', late: false});

    expect(resolveVietQrActionWindow(expired, new Date('2026-06-17T09:00:00.000Z'))).toEqual({
      status: 'open',
      late: true,
      deadlinePassedAt: deadline
    });

    expect(
      resolveVietQrActionWindow(
        {...expired, paymentStatus: 'review_required'},
        new Date('2026-06-22T09:00:00.000Z')
      )
    ).toEqual({status: 'open', late: true, deadlinePassedAt: deadline});
  });

  test('closes the VietQR decision once the late window elapses or the payment is settled', () => {
    const deadline = '2026-06-16T09:00:00.000Z';
    const expired: VietQrExpectedPayment = {
      ...expectedPayment,
      paymentStatus: 'expired',
      paymentDeadlineAt: deadline
    };

    // Exactly 7 days later is already outside the window.
    expect(resolveVietQrActionWindow(expired, new Date('2026-06-23T09:00:00.000Z'))).toEqual({
      status: 'closed',
      code: 'window_elapsed'
    });
    expect(
      resolveVietQrActionWindow({...expired, paymentStatus: 'paid'}, new Date('2026-06-17T09:00:00.000Z'))
    ).toEqual({status: 'closed', code: 'settled'});
    // A rejection is a deliberate decision, not a late arrival.
    expect(
      resolveVietQrActionWindow({...expired, paymentStatus: 'rejected'}, new Date('2026-06-17T09:00:00.000Z'))
    ).toEqual({status: 'closed', code: 'settled'});
    expect(
      resolveVietQrActionWindow({...expired, paymentDeadlineAt: null}, new Date('2026-06-17T09:00:00.000Z'))
    ).toEqual({status: 'closed', code: 'no_deadline'});
  });

  test('rejection is never offered once the hold has lapsed', () => {
    // `apply_payment_transition` only treats `paid` as a late-settleable
    // target; a late `rejected` comes back `stale`. Offering the button would
    // have the admin press it and be told the payment state had changed.
    const deadline = '2026-06-16T09:00:00.000Z';
    const onTime = {...expectedPayment, paymentDeadlineAt: deadline};
    const late: VietQrExpectedPayment = {
      ...expectedPayment,
      paymentStatus: 'expired',
      paymentDeadlineAt: deadline
    };
    const during = new Date('2026-06-16T08:00:00.000Z');
    const after = new Date('2026-06-17T09:00:00.000Z');

    expect(isVietQrPaymentActionAvailable(onTime, 'confirm', during)).toBe(true);
    expect(isVietQrPaymentActionAvailable(onTime, 'reject', during)).toBe(true);
    expect(isVietQrPaymentActionAvailable(late, 'confirm', after)).toBe(true);
    expect(isVietQrPaymentActionAvailable(late, 'reject', after)).toBe(false);
  });

  test('the stock recheck settles an order that was only ever blocked on stock', async () => {
    const {resolveLatePaymentReviewAction, applyPaymentTransition, requireAdmin} =
      await importAdminActions({
        client: createActionClient({
          detail: {...reviewBlockedDetail, reviewReason: 'late_payment_out_of_stock'},
          transition: {status: 'applied', paymentStatus: 'paid', lateSettlement: true}
        })
      });

    await expect(
      resolveLatePaymentReviewAction(reviewResolutionForm())
    ).resolves.toEqual({status: 'settled', paymentStatus: 'paid'});
    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(applyPaymentTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        source: 'admin_review_resolution',
        targetStatus: 'paid',
        orderNumber: order.orderNumber
      }),
      expect.anything()
    );
    // It must never be able to claim a payment arrived.
    expect(applyPaymentTransition).not.toHaveBeenCalledWith(
      expect.objectContaining({providerEventId: expect.anything()}),
      expect.anything()
    );
  });

  test('the stock recheck refuses an order that is not parked on stock', async () => {
    const {resolveLatePaymentReviewAction, applyPaymentTransition} = await importAdminActions({
      client: createActionClient({
        detail: {...reviewBlockedDetail, reviewReason: 'late_payment_detected'}
      })
    });

    await expect(resolveLatePaymentReviewAction(reviewResolutionForm())).resolves.toEqual({
      status: 'not_applicable',
      code: 'review_not_stock_blocked'
    });
    expect(applyPaymentTransition).not.toHaveBeenCalled();
  });

  test('the stock recheck reports still-missing stock instead of claiming success', async () => {
    const {resolveLatePaymentReviewAction, triggerTransactionalEmailOutboxNow} =
      await importAdminActions({
        client: createActionClient({
          detail: {...reviewBlockedDetail, reviewReason: 'late_payment_out_of_stock'},
          transition: {
            status: 'review_required',
            code: 'late_payment_out_of_stock',
            paymentStatus: 'review_required'
          }
        })
      });

    await expect(resolveLatePaymentReviewAction(reviewResolutionForm())).resolves.toEqual({
      status: 'still_blocked',
      code: 'late_payment_out_of_stock'
    });
    expect(triggerTransactionalEmailOutboxNow).not.toHaveBeenCalled();
  });

  test('a lapsed order refuses rejection before it ever reaches the state machine', async () => {
    // The DB answers `stale` for a late `rejected`, so the action must stop
    // first — otherwise the admin presses a live button and is told the
    // payment state changed underneath them.
    const {rejectVietQrPaymentAction, applyPaymentTransition} = await importAdminActions({
      client: createActionClient({
        detail: {
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          paymentId: order.paymentId,
          provider: 'vietqr',
          paymentStatus: 'expired',
          amountMinor: order.amountMinor,
          currencyCode: 'VND',
          reservationExpiresAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
          vietQrEvidence: {
            transferReference: order.orderNumber,
            expectedAmountMinor: order.amountMinor,
            paymentDeadlineAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            actionAvailable: true,
            rejectAvailable: false,
            lateSettlement: true,
            closedReason: null,
            latestEvidence: null
          },
          timeline: []
        }
      })
    });

    await expect(rejectVietQrPaymentAction(rejectForm())).resolves.toEqual({
      status: 'stale',
      code: 'vietqr_action_not_available'
    });
    expect(applyPaymentTransition).not.toHaveBeenCalled();
  });

  test('a late confirmation blocked on stock is reported as review, not as a failed action', async () => {
    const {confirmVietQrPaymentAction, triggerTransactionalEmailOutboxNow} =
      await importAdminActions({
        client: createActionClient({
          transition: {
            status: 'review_required',
            code: 'late_payment_out_of_stock',
            paymentStatus: 'review_required',
            inventoryEffect: 'expired'
          }
        })
      });

    // Reporting this as `error` told the admin nothing had happened when the
    // order had in fact moved to the review queue awaiting a refund.
    await expect(confirmVietQrPaymentAction(confirmForm())).resolves.toEqual({
      status: 'review_required',
      code: 'late_payment_out_of_stock'
    });
    expect(triggerTransactionalEmailOutboxNow).not.toHaveBeenCalled();
  });

  test('admin actions authorize before parsing and delegate exact confirmation to the shared transition command', async () => {
    const {
      confirmVietQrPaymentAction,
      applyPaymentTransition,
      triggerTransactionalEmailOutboxNow,
      requireAdmin,
      client
    } = await importAdminActions();

    const result = await confirmVietQrPaymentAction(confirmForm());

    expect(result).toEqual({ status: 'confirmed', paymentStatus: 'paid', lateSettlement: false });
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
    expect(triggerTransactionalEmailOutboxNow).toHaveBeenCalledWith({
      reason: 'vietqr_admin_paid'
    });
  });

  test('non-admin, stale and duplicate VietQR actions cannot create repeated or regressive effects', async () => {
    const deniedAdmin = vi.fn(async () => {
      throw new Error('not-admin');
    });
    const deniedClient = createActionClient();
    const denied = await importAdminActions({ client: deniedClient, requireAdmin: deniedAdmin });

    await expect(
      denied.confirmVietQrPaymentAction(confirmForm({ receivedAmountMinor: 'not-a-number' }))
    ).rejects.toThrow('not-admin');
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
      client: createActionClient({
        transition: { status: 'duplicate', paymentStatus: 'paid', inventoryEffect: 'none' }
      })
    });
    await expect(duplicate.confirmVietQrPaymentAction(confirmForm())).resolves.toEqual({
      status: 'duplicate',
      paymentStatus: 'paid'
    });
  });

  test('admin confirmation records mismatched bank evidence for operations review', async () => {
    const recordOperationalFailure = vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }));
    const { confirmVietQrPaymentAction, applyPaymentTransition } = await importAdminActions({
      recordOperationalFailure
    });

    await expect(
      confirmVietQrPaymentAction(confirmForm({ bankReference: 'WRONG-REFERENCE' }))
    ).resolves.toEqual({ status: 'invalid', code: 'vietqr_reference_mismatch' });

    expect(applyPaymentTransition).not.toHaveBeenCalled();
    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'payment',
        severity: 'warning',
        errorCode: 'vietqr_reference_mismatch',
        summary: 'VietQR admin confirmation evidence rejected',
        facts: expect.objectContaining({
          provider: 'vietqr',
          action: 'confirm',
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          paymentId: order.paymentId,
          paymentStatus: 'pending',
          code: 'vietqr_reference_mismatch'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(
      /WRONG-REFERENCE|privateReceiptPath|adminNote|bankReference|receipt/i
    );
  });

  test('admin confirmation keeps invalid result stable when operational recording fails', async () => {
    const recordOperationalFailure = vi.fn(async () => {
      throw new Error('operational table unavailable');
    });
    const { confirmVietQrPaymentAction, applyPaymentTransition } = await importAdminActions({
      recordOperationalFailure
    });

    await expect(
      confirmVietQrPaymentAction(confirmForm({ bankReference: 'WRONG-REFERENCE' }))
    ).resolves.toEqual({ status: 'invalid', code: 'vietqr_reference_mismatch' });

    expect(applyPaymentTransition).not.toHaveBeenCalled();
    expect(recordOperationalFailure).toHaveBeenCalledOnce();
  });

  test('admin rejection records transition failures for operations review', async () => {
    const recordOperationalFailure = vi.fn(async () => ({
      status: 'recorded',
      errorId: '76000000-0000-4000-8000-000000000001'
    }));
    const { rejectVietQrPaymentAction } = await importAdminActions({
      client: createActionClient({
        transition: { status: 'error', code: 'transition_rpc_failed' }
      }),
      recordOperationalFailure
    });

    await expect(rejectVietQrPaymentAction(rejectForm())).resolves.toEqual({
      status: 'error',
      code: 'vietqr_action_failed'
    });

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'payment',
        severity: 'error',
        errorCode: 'vietqr_action_failed',
        summary: 'VietQR admin rejection transition failed',
        facts: expect.objectContaining({
          provider: 'vietqr',
          action: 'reject',
          orderId: order.orderId,
          orderNumber: order.orderNumber,
          paymentId: order.paymentId,
          paymentStatus: 'pending',
          code: 'vietqr_action_failed'
        })
      })
    );
    expect(JSON.stringify(recordOperationalFailure.mock.calls)).not.toMatch(
      /Customer transferred|bankReference|privateReceiptPath|adminNote|receipt/i
    );
  });
});
