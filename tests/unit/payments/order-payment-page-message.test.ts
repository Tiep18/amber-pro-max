import { createTranslator } from 'next-intl';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import en from '../../../src/messages/en.json';
import viMessages from '../../../src/messages/vi.json';

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getAuthorizedOrderPayment: vi.fn(),
  getGuestOrderAccessHashFromServer: vi.fn(),
  getPublicSupportConfig: vi.fn(),
  getRequestUser: vi.fn(),
  getServerEnv: vi.fn(),
  getTranslations: vi.fn()
}));

vi.mock('next-intl/server', () => ({ getTranslations: mocks.getTranslations }));
vi.mock('@/auth/request-user', () => ({ getRequestUser: mocks.getRequestUser }));
vi.mock('@/lib/env/server', () => ({ getServerEnv: mocks.getServerEnv }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient
}));
vi.mock('@/payments/guest-access', () => ({
  getGuestOrderAccessHashFromServer: mocks.getGuestOrderAccessHashFromServer
}));
vi.mock('@/payments/queries', () => ({
  getAuthorizedOrderPayment: mocks.getAuthorizedOrderPayment
}));
vi.mock('@/payments/vietqr/customer-actions', () => ({
  declareVietQrTransferAction: vi.fn()
}));
vi.mock('@/payments/vietqr/instructions', () => ({
  getVietQrInstructions: vi.fn()
}));
vi.mock('@/support/config', () => ({ getPublicSupportConfig: mocks.getPublicSupportConfig }));
vi.mock('@/components/checkout/checkout-stepper', () => ({ CheckoutStepper: () => null }));
vi.mock('@/components/fulfillment/download-panel', () => ({ DownloadPanel: () => null }));
vi.mock('@/components/fulfillment/fulfillment-track-summary', () => ({
  FulfillmentTrackSummary: () => null
}));
vi.mock('@/components/fulfillment/physical-tracking-panel', () => ({
  PhysicalTrackingPanel: () => null
}));
vi.mock('@/components/payments/guest-order-session-sync', () => ({
  GuestOrderSessionSync: () => null
}));
vi.mock('@/components/payments/order-line-summary', () => ({ OrderLineSummary: () => null }));
vi.mock('@/components/payments/order-recovery-banner', () => ({ OrderRecoveryBanner: () => null }));
vi.mock('@/components/payments/paypal-buttons', () => ({ PayPalButtons: () => null }));
vi.mock('@/components/payments/payment-state-panel', () => ({ PaymentStatePanel: () => null }));
vi.mock('@/components/payments/payment-status-recheck', () => ({
  PaymentRecheckScope: ({ children }: { children: ReactNode }) => children
}));
vi.mock('@/components/payments/vietqr-instructions', () => ({ VietQrInstructions: () => null }));

import { OrderPaymentPage } from '@/components/payments/order-payment-page';
import { PaymentStatePanel } from '@/components/payments/payment-state-panel';

type ElementLike = {
  type?: unknown;
  props?: { children?: ReactNode; body?: string };
};

function findPaymentStatePanel(node: ReactNode): ElementLike | null {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = findPaymentStatePanel(child);
      if (match) return match;
    }
    return null;
  }

  const element = node as ElementLike;
  if (element.type === PaymentStatePanel) return element;
  return findPaymentStatePanel(element.props?.children);
}

const rejectedVietQrOrder = {
  orderNumber: 'ATB-REJECTED-VIETQR',
  customerPaymentStatus: 'rejected',
  paymentStatus: 'rejected',
  fulfillmentGateStatus: 'locked',
  provider: 'vietqr',
  paymentIntent: 'vietqr_intent',
  market: 'vn',
  amountMinor: 250_000,
  currencyCode: 'VND',
  reservationExpiresAt: null,
  customerTransferDeclaredAt: null,
  shippingAddress: null,
  contactEmailMasked: null,
  lines: [],
  money: {
    subtotalMinor: 250_000,
    discountMinor: 0,
    shippingMinor: 0,
    totalMinor: 250_000,
    discountCode: null
  }
} as const;

describe('OrderPaymentPage rejected VietQR messages', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createSupabaseServerClient.mockResolvedValue({});
    mocks.getAuthorizedOrderPayment.mockResolvedValue({
      status: 'found',
      order: rejectedVietQrOrder
    });
    mocks.getGuestOrderAccessHashFromServer.mockResolvedValue(null);
    mocks.getPublicSupportConfig.mockReturnValue({
      emailHref: null,
      zaloHref: null,
      hasChannels: false,
      storeTimeZone: 'Asia/Ho_Chi_Minh'
    });
    mocks.getRequestUser.mockResolvedValue({ id: 'customer-1' });
    mocks.getServerEnv.mockReturnValue({
      paypal: { status: 'unconfigured' },
      vietqr: { status: 'unconfigured', template: 'compact2' }
    });
    mocks.getTranslations.mockImplementation(
      async ({
        locale,
        namespace
      }: {
        locale: 'en' | 'vi';
        namespace: 'orders' | 'payments.paypal' | 'payments.vietqr';
      }) =>
        createTranslator({
          locale,
          messages: locale === 'en' ? en : viMessages,
          namespace
        })
    );
  });

  it.each([
    [
      'en' as const,
      'Payment was not confirmed, so the items are no longer held and this order cannot be retried. Restore the items to your cart to place a new order.'
    ],
    [
      'vi' as const,
      'Thanh toán chưa được xác nhận, nên sản phẩm không còn được giữ và đơn hàng này không thể thử lại. Hãy khôi phục sản phẩm vào giỏ để đặt đơn hàng mới.'
    ]
  ])(
    'renders the %s support-independent recovery body through the runtime translator',
    async (locale, expectedBody) => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const page = await OrderPaymentPage({ locale, orderNumber: rejectedVietQrOrder.orderNumber });
      const panel = findPaymentStatePanel(page);

      expect(panel?.props?.body).toBe(expectedBody);
      expect(panel?.props?.body).not.toBe('orders.status.rejected.vietqrBody');
      expect(panel?.props?.body).not.toMatch(/contact support|liên hệ hỗ trợ/i);
      expect(consoleError).not.toHaveBeenCalled();
    }
  );
});
