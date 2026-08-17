import {describe, expect, test, vi} from 'vitest';

vi.mock('@/operations/errors', () => ({recordOperationalFailure: vi.fn()}));

import {getAuthorizedOrderPayment, getAdminOrderDetail, getAdminOrderQueue} from '@/payments/queries';
import {recordOperationalFailure} from '@/operations/errors';

describe('payment order projections', () => {
  const shippingAddress = {
    recipientName: 'Taylor Customer',
    phoneNumber: '+15551234567',
    countryCode: 'US',
    region: 'California',
    locality: 'San Francisco',
    addressLine1: '123 Market Street',
    addressLine2: null,
    postalCode: '94105'
  };

  test('customer lookup calls the narrow status RPC with a guest token hash', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        status: 'found',
        orderNumber: 'ATB-20260616-0001',
        customerPaymentStatus: 'awaiting_payment',
        fulfillmentGateStatus: 'locked',
        amountMinor: 1200,
        subtotalMinor: 1300,
        discountMinor: 100,
        shippingMinor: 0,
        discountCode: 'WELCOME10',
        currencyCode: 'USD',
        reservationExpiresAt: '2026-06-16T12:00:00.000Z',
        contactEmail: 'customer@example.com',
        shippingAddress,
        lines: [
          {
            lineId: 'line-1',
            title: 'Amigurumi Bear Pattern',
            variantLabel: null,
            sku: 'PAT-001',
            fulfillmentType: 'digital',
            quantity: 1,
            unitPriceMinor: 1300,
            lineSubtotalMinor: 1300,
            discountAllocationMinor: 100
          }
        ]
      },
      error: null
    });

    const result = await getAuthorizedOrderPayment({
      orderNumber: 'ATB-20260616-0001',
      guestSecretHash: 'hash',
      client: {rpc} as never
    });

    expect(rpc).toHaveBeenCalledWith('get_order_payment_status', {
      p_order_number: 'ATB-20260616-0001',
      p_guest_secret_hash: 'hash'
    });
    expect(result).toEqual({
      status: 'found',
      order: {
        orderNumber: 'ATB-20260616-0001',
        customerPaymentStatus: 'awaiting_payment',
        fulfillmentGateStatus: 'locked',
        amountMinor: 1200,
        currencyCode: 'USD',
        reservationExpiresAt: '2026-06-16T12:00:00.000Z',
        customerTransferDeclaredAt: null,
        shippingAddress,
        contactEmailMasked: 'c***r@example.com',
        lines: [
          {
            lineId: 'line-1',
            title: 'Amigurumi Bear Pattern',
            variantLabel: null,
            sku: 'PAT-001',
            fulfillmentType: 'digital',
            quantity: 1,
            unitPriceMinor: 1300,
            lineSubtotalMinor: 1300,
            discountAllocationMinor: 100
          }
        ],
        money: {
          subtotalMinor: 1300,
          discountMinor: 100,
          shippingMinor: 0,
          totalMinor: 1200,
          discountCode: 'WELCOME10'
        }
      }
    });
  });

  test('customer lookup defaults lines and money fields when the RPC omits them (older cached response)', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        status: 'found',
        orderNumber: 'ATB-20260616-0002',
        customerPaymentStatus: 'awaiting_payment',
        fulfillmentGateStatus: 'locked',
        amountMinor: 500,
        currencyCode: 'USD',
        reservationExpiresAt: null,
        shippingAddress: null
      },
      error: null
    });

    const result = await getAuthorizedOrderPayment({
      orderNumber: 'ATB-20260616-0002',
      guestSecretHash: 'hash',
      client: {rpc} as never
    });

    expect(result).toMatchObject({
      status: 'found',
      order: {
        lines: [],
        money: {subtotalMinor: 0, discountMinor: 0, shippingMinor: 0, totalMinor: 500, discountCode: null},
        contactEmailMasked: null
      }
    });
  });

  test('records customer order lookup failures without exposing guest access or address details', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'relation private.order_secret does not exist for customer@example.com'}
    });

    await expect(getAuthorizedOrderPayment({
      orderNumber: 'ATB-20260616-0001',
      guestSecretHash: 'super-secret-hash',
      client: {rpc} as never
    })).resolves.toEqual({status: 'error', code: 'order_payment_lookup_failed'});

    expect(recordOperationalFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        area: 'payment',
        severity: 'error',
        errorCode: 'order_payment_lookup_failed',
        summary: 'Customer order payment lookup failed',
        facts: expect.objectContaining({
          action: 'order_payment_lookup',
          orderNumber: 'ATB-20260616-0001',
          code: 'order_payment_lookup_failed'
        })
      })
    );
    expect(JSON.stringify(vi.mocked(recordOperationalFailure).mock.calls)).not.toMatch(/super-secret-hash|customer@example|order_secret|relation|Market Street|\+1555/i);
  });

  test('keeps payment query error results stable when operational recording fails', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    vi.mocked(recordOperationalFailure).mockRejectedValueOnce(new Error('operational table unavailable'));
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'private customer lookup failed'}
    });

    await expect(getAuthorizedOrderPayment({
      orderNumber: 'ATB-20260616-0001',
      guestSecretHash: 'super-secret-hash',
      client: {rpc} as never
    })).resolves.toEqual({status: 'error', code: 'order_payment_lookup_failed'});

    vi.mocked(recordOperationalFailure).mockRejectedValueOnce(new Error('operational table unavailable'));
    const queueOrder = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'queue failed'}
    });
    const queueSelect = vi.fn().mockReturnValue({order: queueOrder});

    await expect(getAdminOrderQueue({
      client: {from: vi.fn().mockReturnValue({select: queueSelect})} as never,
      requireAdmin: vi.fn().mockResolvedValue({id: 'admin-user'})
    })).resolves.toEqual({status: 'error', code: 'admin_order_queue_failed'});
  });

  test('admin queue and detail require application authorization before querying projections', async () => {
    const requireAdmin = vi.fn().mockResolvedValue({id: 'admin-user'});
    const queueOrder = vi.fn().mockResolvedValue({
      data: [
        {
          order_id: 'order-id',
          order_number: 'ATB-20260616-0001',
          contact_email: 'customer@example.com',
          customer_payment_status: 'awaiting_payment',
          payment_status: 'pending',
          fulfillment_gate_status: 'locked',
          total_minor: 1200,
          currency_code: 'USD',
          provider: 'paypal',
          reservation_expires_at: '2026-06-16T12:00:00.000Z',
          updated_at: '2026-06-16T11:30:00.000Z'
        }
      ],
      error: null
    });
    const select = vi.fn().mockReturnValue({order: queueOrder});
    const from = vi.fn().mockReturnValue({select});

    const queue = await getAdminOrderQueue({client: {from} as never, requireAdmin});

    expect(requireAdmin).toHaveBeenCalledOnce();
    expect(from).toHaveBeenCalledWith('order_payment_statuses');
    expect(queue.status).toBe('success');

    const detailSingle = vi.fn().mockResolvedValue({
      data: {
        order_id: 'order-id',
        order_number: 'ATB-20260616-0001',
        contact_email: 'customer@example.com',
        owner_user_id: null,
        payment_id: 'payment-id',
        customer_payment_status: 'awaiting_payment',
        payment_status: 'pending',
        fulfillment_gate_status: 'locked',
        digital_fulfillment_status: 'blocked',
        physical_fulfillment_status: 'blocked',
        refund_status: 'none',
        refunded_amount_minor: 0,
        review_reason: null,
        total_minor: 1200,
        currency_code: 'USD',
        provider: 'paypal',
        reservation_expires_at: '2026-06-16T12:00:00.000Z',
        shipping_address: shippingAddress,
        updated_at: '2026-06-16T11:30:00.000Z'
      },
      error: null
    });
    const eq = vi.fn().mockReturnValue({maybeSingle: detailSingle});
    const detailSelect = vi.fn().mockReturnValue({eq});
    const rpc = vi.fn().mockResolvedValue({data: [], error: null});
    const detail = await getAdminOrderDetail({
      orderId: 'order-id',
      client: {from: vi.fn().mockReturnValue({select: detailSelect}), rpc} as never,
      requireAdmin
    });

    expect(rpc).toHaveBeenCalledWith('get_admin_order_timeline', {p_order_id: 'order-id'});
    expect(detail).toMatchObject({
      status: 'success',
      order: {
        shippingAddress
      }
    });
  });

  test('projects only numeric entitlement versions for failed digital email reissue', async () => {
    const baseOrder = {
      order_id: 'order-id',
      order_number: 'ATB-20260817-0001',
      contact_email: 'customer@example.com',
      owner_user_id: null,
      payment_id: 'payment-id',
      customer_payment_status: 'paid',
      payment_status: 'paid',
      fulfillment_gate_status: 'open',
      digital_fulfillment_status: 'eligible',
      physical_fulfillment_status: 'not_required',
      refund_status: 'not_refunded',
      refunded_amount_minor: 0,
      review_reason: null,
      total_minor: 2500,
      currency_code: 'USD',
      provider: 'paypal',
      reservation_expires_at: null,
      shipping_address: null,
      updated_at: '2026-08-17T10:00:00.000Z'
    };
    const from = vi.fn((table: string) => ({
      select: vi.fn(() => {
        if (table === 'order_payment_statuses') {
          return { eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: baseOrder, error: null })) })) };
        }
        if (table === 'transactional_email_outbox') {
          return {
            eq: vi.fn(() => ({
              in: vi.fn(() => ({
                order: vi.fn(async () => ({
                  data: [
                    {
                      id: 'email-versioned', order_id: 'order-id', entitlement_id: 'entitlement-1',
                      event_type: 'digital_access_reissued', recipient_email: 'customer@example.com',
                      locale: 'en', status: 'failed',
                      payload: { orderNumber: 'ATB-20260817-0001', entitlementVersion: 4 },
                      available_at: null, created_at: '2026-08-17T10:00:00.000Z'
                    },
                    {
                      id: 'email-malformed', order_id: 'order-id', entitlement_id: 'entitlement-2',
                      event_type: 'digital_access_granted', recipient_email: 'customer@example.com',
                      locale: 'en', status: 'failed',
                      payload: { orderNumber: 'ATB-20260817-0001', entitlementVersion: '4' },
                      available_at: null, created_at: '2026-08-17T09:00:00.000Z'
                    }
                  ],
                  error: null
                }))
              }))
            }))
          };
        }
        if (table === 'physical_fulfillments') {
          return { eq: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })) };
        }
        return {
          eq: vi.fn(() => ({
            in: vi.fn(() => ({ order: vi.fn(async () => ({ data: [], error: null })) })),
            order: vi.fn(async () => ({ data: [], error: null }))
          }))
        };
      })
    }));

    const result = await getAdminOrderDetail({
      orderId: 'order-id',
      client: { from, rpc: vi.fn(async () => ({ data: [], error: null })) } as never,
      requireAdmin: vi.fn(async () => ({ id: 'admin-user' }))
    });

    expect(result).toMatchObject({
      status: 'success',
      order: {
        failedEmails: [
          { id: 'email-versioned', entitlementVersion: 4 },
          { id: 'email-malformed', entitlementVersion: null }
        ]
      }
    });
  });

  test('records admin order queue and detail query failures without exposing customer PII', async () => {
    vi.mocked(recordOperationalFailure).mockClear();
    const requireAdmin = vi.fn().mockResolvedValue({id: 'admin-user'});
    const queueOrder = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'queue failed for customer@example.com'}
    });
    const queueSelect = vi.fn().mockReturnValue({order: queueOrder});

    await expect(getAdminOrderQueue({
      client: {from: vi.fn().mockReturnValue({select: queueSelect})} as never,
      requireAdmin
    })).resolves.toEqual({status: 'error', code: 'admin_order_queue_failed'});

    const detailSingle = vi.fn().mockResolvedValue({
      data: {
        order_id: 'order-id',
        order_number: 'ATB-20260616-0001',
        contact_email: 'customer@example.com',
        total_minor: 1200,
        currency_code: 'USD',
        provider: 'paypal',
        shipping_address: shippingAddress
      },
      error: null
    });
    const eq = vi.fn().mockReturnValue({maybeSingle: detailSingle});
    const detailSelect = vi.fn().mockReturnValue({eq});
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: {message: 'timeline private detail failed'}
    });

    await expect(getAdminOrderDetail({
      orderId: 'order-id',
      client: {from: vi.fn().mockReturnValue({select: detailSelect}), rpc} as never,
      requireAdmin
    })).resolves.toEqual({status: 'error', code: 'admin_order_detail_failed'});

    expect(recordOperationalFailure).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'admin_order_queue_failed',
        summary: 'Admin order queue query failed',
        facts: expect.objectContaining({
          action: 'admin_order_queue',
          code: 'admin_order_queue_failed'
        })
      })
    );
    expect(recordOperationalFailure).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        area: 'admin',
        severity: 'error',
        errorCode: 'admin_order_detail_failed',
        summary: 'Admin order timeline query failed',
        facts: expect.objectContaining({
          action: 'admin_order_timeline',
          orderId: 'order-id',
          code: 'admin_order_detail_failed'
        })
      })
    );
    expect(JSON.stringify(vi.mocked(recordOperationalFailure).mock.calls)).not.toMatch(/customer@example|Market Street|\+1555|timeline private|queue failed/i);
  });
});
