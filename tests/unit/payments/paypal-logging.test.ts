import {afterEach, describe, expect, test, vi} from 'vitest';

import {logPayPalStage, sanitizePayPalProviderOrderForLog} from '@/payments/paypal/logging';

describe('PayPal logging helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  test('prints nested metadata as expanded JSON instead of collapsed console objects', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    logPayPalStage('capture.provider_capture_response', {
      providerOrder: {
        purchaseUnits: [
          {
            invoiceId: 'ATB-123',
            captures: [{providerCaptureId: 'CAPTURE-123'}]
          }
        ]
      }
    });

    expect(info).toHaveBeenCalledWith(
      '[paypal-flow] capture.provider_capture_response',
      JSON.stringify(
        {
          providerOrder: {
            purchaseUnits: [
              {
                invoiceId: 'ATB-123',
                captures: [{providerCaptureId: 'CAPTURE-123'}]
              }
            ]
          }
        },
        null,
        2
      )
    );
  });

  test('keeps diagnostic capture facts while dropping sensitive payer details', () => {
    const sanitized = sanitizePayPalProviderOrderForLog({
      id: 'PAYPAL-ORDER-123',
      status: 'COMPLETED',
      payer: {
        email_address: 'buyer@example.com',
        name: {given_name: 'Secret'}
      },
      access_token: 'secret-token',
      purchase_units: [
        {
          reference_id: 'local-order-id',
          invoice_id: 'ATB-123',
          custom_id: 'local-order-id',
          payee: {merchant_id: 'merchant-123', email_address: 'seller@example.com'},
          shipping: {address: {address_line_1: 'hidden'}},
          payments: {
            captures: [
              {
                id: 'CAPTURE-123',
                status: 'COMPLETED',
                invoice_id: 'ATB-123',
                custom_id: 'local-order-id',
                payee: {merchant_id: 'merchant-123', email_address: 'hidden-seller@example.com'},
                amount: {currency_code: 'USD', value: '97.50'},
                seller_receivable_breakdown: {
                  gross_amount: {currency_code: 'USD', value: '97.50'}
                },
                supplementary_data: {
                  related_ids: {order_id: 'PAYPAL-ORDER-123'}
                }
              }
            ]
          }
        }
      ]
    });

    expect(sanitized).toEqual({
      providerOrderId: 'PAYPAL-ORDER-123',
      providerOrderStatus: 'COMPLETED',
      purchaseUnits: [
        {
          referenceId: 'local-order-id',
          invoiceId: 'ATB-123',
          customId: 'local-order-id',
          merchantId: 'merchant-123',
          captures: [
            {
              providerCaptureId: 'CAPTURE-123',
              captureStatus: 'COMPLETED',
              invoiceId: 'ATB-123',
              customId: 'local-order-id',
              merchantId: 'merchant-123',
              relatedOrderId: 'PAYPAL-ORDER-123',
              amountCurrencyCode: 'USD',
              amountValue: '97.50',
              grossCurrencyCode: 'USD',
              grossValue: '97.50'
            }
          ]
        }
      ]
    });
    expect(JSON.stringify(sanitized)).not.toMatch(/buyer@example|seller@example|hidden-seller|Secret|hidden|secret-token/i);
  });
});
