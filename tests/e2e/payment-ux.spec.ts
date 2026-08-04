import {expect, test} from '@playwright/test';

import {signIn} from './fixtures/authenticated-users';
import {
  cleanupPhase10Commerce,
  seedPhase10Commerce,
  type Phase10CommerceSeed,
  type Phase10PaymentState
} from './fixtures/phase-10-commerce-seed';

let seed: Phase10CommerceSeed;

const en = {
  heading: {
    awaiting_payment: 'Awaiting payment',
    verifying_payment: 'Verifying payment',
    review_required: 'Payment needs review',
    paid: 'Payment confirmed',
    failed: 'Payment failed',
    cancelled: 'Payment cancelled',
    rejected: 'Bank transfer rejected',
    expired: 'Payment window expired',
    partially_refunded: 'Partially refunded',
    refunded: 'Refunded'
  },
  deadline: 'Reservation deadline',
  browse: 'Browse products',
  confirmedTotal: 'Confirmed total',
  accessDenied: 'This order cannot be opened',
  recoverGuest: 'Recover a guest order'
} as const;

const vietqr = {
  vi: {
    heading: 'Đang chờ thanh toán',
    amount: 'Số tiền chính xác',
    reference: 'Nội dung chuyển khoản',
    copyAmount: 'Sao chép số tiền',
    copyReference: 'Sao chép nội dung',
    download: 'Tải mã QR',
    declaration: 'Thông báo này không xác nhận thanh toán. Người bán vẫn cần kiểm tra chuyển khoản.'
  },
  en: {
    heading: 'Awaiting payment',
    download: 'Download QR code',
    manual: 'Manual bank transfer details'
  }
} as const;

test.beforeAll(async () => {
  seed = await seedPhase10Commerce();
});

test.afterAll(async () => {
  await cleanupPhase10Commerce();
});

const STATUS_BY_FIXTURE: Record<Phase10PaymentState, keyof typeof en.heading> = {
  'pending-paypal': 'awaiting_payment',
  'pending-vietqr': 'awaiting_payment',
  verifying: 'verifying_payment',
  'review-required': 'review_required',
  'paid-digital': 'paid',
  'paid-physical': 'paid',
  'paid-mixed': 'paid',
  failed: 'failed',
  cancelled: 'cancelled',
  rejected: 'rejected',
  expired: 'expired',
  'partially-refunded': 'partially_refunded',
  refunded: 'refunded'
};

const TERMINAL_RECOVERY: Phase10PaymentState[] = ['failed', 'cancelled', 'rejected', 'expired'];

test('authorized owner sees every payment state with one truthful heading, action, and deadline contract', async ({page}) => {
  const first = seed.orders['pending-paypal'];
  await signIn(page, seed.customer, `/en/orders/${first.orderNumber}`);

  for (const [state, fixture] of Object.entries(seed.orders) as Array<
    [Phase10PaymentState, Phase10CommerceSeed['orders'][Phase10PaymentState]]
  >) {
    await test.step(state, async () => {
      await page.goto(`/en/orders/${fixture.orderNumber}`);
      const statusKey = STATUS_BY_FIXTURE[state];
      await expect(
        page.getByRole('heading', {name: en.heading[statusKey], exact: true})
      ).toBeVisible();
      const deadline = page.getByText(/^(?:Reservation deadline:|Payment deadline$)/);
      if (state === 'pending-paypal' || state === 'pending-vietqr' || state === 'verifying') {
        await expect(deadline).toHaveCount(1);
      } else {
        await expect(deadline).toHaveCount(0);
      }

      if (TERMINAL_RECOVERY.includes(state)) {
        await expect(page.getByRole('link', {name: en.browse})).toBeVisible();
        await expect(page.getByText(/Pay with PayPal|Download QR code/i)).toHaveCount(0);
      }
      if (state.startsWith('paid-')) {
        await expect(page.getByText(en.confirmedTotal).first()).toBeVisible();
        await expect(page.getByText(/phase10-customer-.*@example\.com/i)).toHaveCount(0);
      }
      if (state === 'partially-refunded' || state === 'refunded') {
        await expect(page.getByText(en.deadline, {exact: true})).toHaveCount(0);
        await expect(page.getByRole('button', {name: /Pay|payment/i})).toHaveCount(0);
      }
    });
  }
});

test('VietQR remains bilingual, manual, downloadable, and never self-confirms payment', async ({page}) => {
  const fixture = seed.orders['pending-vietqr'];
  await signIn(page, seed.customer, `/vi/don-hang/${fixture.orderNumber}`);
  await expect(page.getByRole('heading', {name: vietqr.vi.heading})).toBeVisible();
  await expect(page.getByText(vietqr.vi.amount, {exact: true})).toBeVisible();
  await expect(page.getByText(vietqr.vi.reference, {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: vietqr.vi.copyAmount})).toBeVisible();
  await expect(page.getByRole('button', {name: vietqr.vi.copyReference})).toBeVisible();
  await expect(page.getByRole('link', {name: vietqr.vi.download})).toBeVisible();
  await expect(page.getByText(vietqr.vi.declaration)).toBeVisible();
  await expect(page.getByRole('button', {name: /đã thanh toán|paid/i})).toHaveCount(0);

  await page.goto(`/en/orders/${fixture.orderNumber}`);
  await expect(page.getByRole('heading', {name: vietqr.en.heading})).toBeVisible();
  await expect(page.getByRole('link', {name: vietqr.en.download})).toBeVisible();
  await expect(page.getByText(vietqr.en.manual).first()).toBeVisible();
});

test('unauthorized order lookup is generic and non-enumerating', async ({page}) => {
  const fixture = seed.orders['paid-digital'];
  await page.goto(`/en/orders/${fixture.orderNumber}`);
  await expect(page.getByRole('heading', {name: en.accessDenied})).toBeVisible();
  await expect(page.getByRole('link', {name: en.recoverGuest})).toBeVisible();
  await expect(page.getByText(fixture.orderNumber, {exact: false})).toHaveCount(0);
  await expect(page.getByText(/PayPal|VietQR|USD|VND|\$/i)).toHaveCount(0);
});

test('terminal missing-snapshot recovery leads to catalog and never retries the same order', async ({page}) => {
  const fixture = seed.orders.failed;
  await signIn(page, seed.customer, `/en/orders/${fixture.orderNumber}`);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  const browse = page.getByRole('link', {name: en.browse});
  await expect(browse).toBeVisible();
  await expect(browse).toHaveAttribute('href', '/en/catalog');
  await expect(page.getByRole('button', {name: /retry|PayPal|VietQR/i})).toHaveCount(0);
});
