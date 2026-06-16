export const paypalFixtureIds = {
  localOrderId: '11111111-1111-4111-8111-111111111111',
  orderNumber: 'ATB-20260615-0001',
  paypalOrderId: 'PAYPAL-ORDER-TEST-0001',
  paypalCaptureId: 'PAYPAL-CAPTURE-TEST-0001',
  merchantId: 'MERCHANT-TEST-ONLY',
  requestId: 'atb-paypal-create-ATB-20260615-0001'
} as const;

export const paypalCompletedCaptureEvent = {
  id: 'WH-TEST-CAPTURE-COMPLETED-0001',
  event_type: 'PAYMENT.CAPTURE.COMPLETED',
  create_time: '2026-06-15T03:00:00Z',
  resource: {
    id: paypalFixtureIds.paypalCaptureId,
    status: 'COMPLETED',
    amount: {
      currency_code: 'USD',
      value: '42.50'
    },
    supplementary_data: {
      related_ids: {
        order_id: paypalFixtureIds.paypalOrderId
      }
    },
    seller_receivable_breakdown: {
      gross_amount: {
        currency_code: 'USD',
        value: '42.50'
      }
    },
    payee: {
      merchant_id: paypalFixtureIds.merchantId
    },
    custom_id: paypalFixtureIds.localOrderId,
    invoice_id: paypalFixtureIds.orderNumber
  }
} as const;

export const paypalDeclinedCaptureEvent = {
  id: 'WH-TEST-CAPTURE-DECLINED-0001',
  event_type: 'PAYMENT.CAPTURE.DECLINED',
  create_time: '2026-06-15T03:02:00Z',
  resource: {
    id: 'PAYPAL-CAPTURE-TEST-DECLINED',
    status: 'DECLINED',
    amount: {
      currency_code: 'USD',
      value: '42.50'
    },
    supplementary_data: {
      related_ids: {
        order_id: paypalFixtureIds.paypalOrderId
      }
    },
    payee: {
      merchant_id: paypalFixtureIds.merchantId
    },
    custom_id: paypalFixtureIds.localOrderId,
    invoice_id: paypalFixtureIds.orderNumber
  }
} as const;

export const paypalPendingCaptureEvent = {
  ...paypalDeclinedCaptureEvent,
  id: 'WH-TEST-CAPTURE-PENDING-0001',
  event_type: 'PAYMENT.CAPTURE.PENDING',
  resource: {
    ...paypalDeclinedCaptureEvent.resource,
    id: 'PAYPAL-CAPTURE-TEST-PENDING',
    status: 'PENDING'
  }
} as const;

export const paypalMismatchedMerchantEvent = {
  ...paypalCompletedCaptureEvent,
  id: 'WH-TEST-CAPTURE-MERCHANT-MISMATCH-0001',
  resource: {
    ...paypalCompletedCaptureEvent.resource,
    payee: {
      merchant_id: 'MERCHANT-MISMATCH-TEST-ONLY'
    }
  }
} as const;

export const paypalMismatchedAmountEvent = {
  ...paypalCompletedCaptureEvent,
  id: 'WH-TEST-CAPTURE-AMOUNT-MISMATCH-0001',
  resource: {
    ...paypalCompletedCaptureEvent.resource,
    amount: {
      currency_code: 'USD',
      value: '41.50'
    },
    seller_receivable_breakdown: {
      gross_amount: {
        currency_code: 'USD',
        value: '41.50'
      }
    }
  }
} as const;

export const paypalMismatchedCurrencyEvent = {
  ...paypalCompletedCaptureEvent,
  id: 'WH-TEST-CAPTURE-CURRENCY-MISMATCH-0001',
  resource: {
    ...paypalCompletedCaptureEvent.resource,
    amount: {
      currency_code: 'VND',
      value: '42.50'
    },
    seller_receivable_breakdown: {
      gross_amount: {
        currency_code: 'VND',
        value: '42.50'
      }
    }
  }
} as const;

export const paypalPartialRefundEvent = {
  id: 'WH-TEST-CAPTURE-PARTIAL-REFUND-0001',
  event_type: 'PAYMENT.CAPTURE.REFUNDED',
  create_time: '2026-06-15T03:03:00Z',
  resource: {
    id: 'PAYPAL-REFUND-TEST-PARTIAL',
    status: 'COMPLETED',
    amount: {
      currency_code: 'USD',
      value: '12.50'
    },
    invoice_id: paypalFixtureIds.orderNumber,
    custom_id: paypalFixtureIds.localOrderId,
    links: [
      {
        href: `https://api-m.sandbox.paypal.com/v2/payments/captures/${paypalFixtureIds.paypalCaptureId}`,
        rel: 'up',
        method: 'GET'
      }
    ]
  }
} as const;

export const paypalFullRefundEvent = {
  ...paypalPartialRefundEvent,
  id: 'WH-TEST-CAPTURE-FULL-REFUND-0001',
  resource: {
    ...paypalPartialRefundEvent.resource,
    id: 'PAYPAL-REFUND-TEST-FULL',
    amount: {
      currency_code: 'USD',
      value: '42.50'
    }
  }
} as const;

export const paypalFixtureHeaders = {
  'paypal-auth-algo': 'SHA256withRSA',
  'paypal-cert-url': 'https://api-m.sandbox.paypal.com/v1/notifications/certs/test-cert',
  'paypal-transmission-id': 'transmission-test-0001',
  'paypal-transmission-sig': 'fixture-signature-not-valid-for-production',
  'paypal-transmission-time': '2026-06-15T03:00:01Z'
} as const;

export const paypalFixtureEvents = [
  paypalCompletedCaptureEvent,
  paypalDeclinedCaptureEvent,
  paypalPendingCaptureEvent,
  paypalMismatchedMerchantEvent,
  paypalMismatchedAmountEvent,
  paypalMismatchedCurrencyEvent,
  paypalPartialRefundEvent,
  paypalFullRefundEvent
] as const;
