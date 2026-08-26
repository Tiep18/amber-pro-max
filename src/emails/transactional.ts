import {formatMoney} from '@/catalog/money';
import type {TransactionalEmailEventType} from '@/fulfillment/schemas';
import {
  normalizeNewsletterUnsubscribeToken,
  type NewsletterUnsubscribeToken
} from '@/newsletter/unsubscribe-token';
import {formatPaymentDateTime} from '@/payments/format';

type Locale = 'en' | 'vi';

export type TransactionalEmailRow = {
  id: string;
  eventType: TransactionalEmailEventType;
  recipientEmail: string;
  locale: Locale;
  orderId: string | null;
  entitlementId: string | null;
  payload: Record<string, unknown>;
  /**
   * Incremented by the claim RPC; bounds transient-failure retries. Optional
   * because rows are also constructed directly by callers that never go
   * through the outbox claim path.
   */
  attemptCount?: number;
};

export type TransactionalEmailVietQrContext = {
  bankId: string;
  accountName: string;
  accountNoMasked: string;
  qrImageUrl: string;
};

export type TransactionalEmailRenderContext = {
  siteUrl: string;
  downloadToken?: string | null;
  guestToken?: string | null;
  newsletterToken?: string | null;
  expiresAt?: Date | string | null;
  vietqr?: TransactionalEmailVietQrContext | null;
};

export type RenderedTransactionalEmail = {
  subject: string;
  html: string;
  text: string;
};

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : '';
}

function orderNumber(row: TransactionalEmailRow) {
  return stringValue(row.payload.orderNumber) || 'your order';
}

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

function absoluteUrl(siteUrl: string, path: string) {
  return new URL(path, siteUrl).toString();
}

function orderPath(locale: Locale, order: string, token?: string | null) {
  const base = locale === 'vi' ? `/vi/don-hang/${encodeURIComponent(order)}` : `/en/orders/${encodeURIComponent(order)}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}

// A reopen token proves inbox control, not the checkout `guest_secret_hash`.
// It must be redeemed server-side before the order page will authorize the
// visitor, so this link never points at the order page directly.
function orderReopenPath(locale: Locale, order: string, token: string) {
  const params = new URLSearchParams({orderNumber: order, token, locale});
  return `/api/orders/access?${params.toString()}`;
}

function orderClaimPath(locale: Locale, order: string, token: string) {
  const base = locale === 'vi' ? `/vi/don-hang/${encodeURIComponent(order)}` : `/en/orders/${encodeURIComponent(order)}`;
  return `${base}/claim?token=${encodeURIComponent(token)}`;
}

function downloadPath(order: string, token?: string | null) {
  const params = new URLSearchParams({orderNumber: order});
  if (token) {
    params.set('token', token);
  }
  return `/api/downloads?${params.toString()}`;
}

function newsletterUnsubscribePath(locale: Locale, token: NewsletterUnsubscribeToken) {
  const path = locale === 'vi' ? '/vi/ban-tin/huy-dang-ky' : '/en/newsletter/unsubscribe';
  return `${path}?token=${encodeURIComponent(token)}`;
}

function hoursCopy(locale: Locale, hours: unknown) {
  const value = typeof hours === 'number' && Number.isFinite(hours) ? hours : 24;
  return locale === 'vi' ? `${value} giờ` : `${value} hours`;
}

function messageShell(subject: string, intro: string, linkText: string, link: string, footer: string): RenderedTransactionalEmail {
  const safeSubject = escapeHtml(subject);
  const safeIntro = escapeHtml(intro);
  const safeLinkText = escapeHtml(linkText);
  const safeLink = escapeHtml(link);
  const safeFooter = escapeHtml(footer);
  return {
    subject,
    html: `<main><h1>${safeSubject}</h1><p>${safeIntro}</p><p><a href="${safeLink}">${safeLinkText}</a></p><p>${safeFooter}</p></main>`,
    text: `${subject}\n\n${intro}\n${linkText}: ${link}\n\n${footer}`
  };
}

// A richer shell for receipts that need labelled facts (totals, bank
// transfer details) rather than a single sentence — used by order_created
// and payment_received, which must stay readable without images.
function messageShellWithRows(input: {
  subject: string;
  intro: string;
  rows: {label: string; value: string}[];
  ctaLabel?: string;
  ctaLink?: string;
  footer: string;
}): RenderedTransactionalEmail {
  const safeSubject = escapeHtml(input.subject);
  const safeIntro = escapeHtml(input.intro);
  const safeFooter = escapeHtml(input.footer);
  const rowsHtml = input.rows
    .filter((row) => row.value)
    .map((row) => `<p><strong>${escapeHtml(row.label)}:</strong> ${escapeHtml(row.value)}</p>`)
    .join('');
  const ctaHtml =
    input.ctaLabel && input.ctaLink
      ? `<p><a href="${escapeHtml(input.ctaLink)}">${escapeHtml(input.ctaLabel)}</a></p>`
      : '';
  const rowsText = input.rows
    .filter((row) => row.value)
    .map((row) => `${row.label}: ${row.value}`)
    .join('\n');
  const ctaText = input.ctaLabel && input.ctaLink ? `\n${input.ctaLabel}: ${input.ctaLink}\n` : '';
  return {
    subject: input.subject,
    html: `<main><h1>${safeSubject}</h1><p>${safeIntro}</p>${rowsHtml}${ctaHtml}<p>${safeFooter}</p></main>`,
    text: `${input.subject}\n\n${input.intro}\n\n${rowsText}\n${ctaText}\n${input.footer}`
  };
}

export function renderTransactionalEmail(row: TransactionalEmailRow, context: TransactionalEmailRenderContext): RenderedTransactionalEmail {
  const locale = row.locale === 'vi' ? 'vi' : 'en';
  const order = orderNumber(row);
  const siteUrl = context.siteUrl;
  const expires = hoursCopy(locale, row.payload.expiresInHours);

  if (row.eventType === 'newsletter_subscribed') {
    const newsletterToken = normalizeNewsletterUnsubscribeToken(context.newsletterToken);
    if (!newsletterToken) {
      throw new Error('newsletter unsubscribe token is invalid');
    }
    const link = absoluteUrl(siteUrl, newsletterUnsubscribePath(locale, newsletterToken));
    const subject = locale === 'vi' ? 'Bạn đã đăng ký bản tin' : 'You subscribed to the newsletter';
    const intro = locale === 'vi'
      ? 'Đăng ký bản tin của bạn đã được ghi nhận.'
      : 'Your newsletter subscription was recorded.';
    const footer = locale === 'vi'
      ? 'Bạn có thể hủy đăng ký bất kỳ lúc nào bằng liên kết này.'
      : 'You can unsubscribe at any time with this link.';
    return messageShell(subject, intro, locale === 'vi' ? 'Hủy đăng ký' : 'Unsubscribe', link, footer);
  }

  if (row.eventType === 'digital_access_granted' || row.eventType === 'digital_access_reissued') {
    const link = absoluteUrl(siteUrl, downloadPath(order, context.downloadToken));
    const subject = locale === 'vi' ? `Mẫu PDF cho đơn hàng ${order}` : `Your PDF pattern for order ${order}`;
    const intro =
      locale === 'vi'
        ? `Mẫu PDF đã thanh toán sẵn sàng. Liên kết này có thời hạn ${expires}.`
        : `Your paid PDF pattern is ready. This app link is valid for ${expires}.`;
    const footer =
      locale === 'vi'
        ? 'Liên kết sẽ kiểm tra lại quyền truy cập trước khi tạo tệp tải xuống riêng.'
        : 'The app rechecks your access before creating a private download link.';
    return messageShell(subject, intro, locale === 'vi' ? 'Tải PDF' : 'Download PDF', link, footer);
  }

  if (row.eventType === 'guest_order_reopen' || row.eventType === 'guest_order_claim') {
    const link = absoluteUrl(
      siteUrl,
      context.guestToken
        ? row.eventType === 'guest_order_claim'
          ? orderClaimPath(locale, order, context.guestToken)
          : orderReopenPath(locale, order, context.guestToken)
        : orderPath(locale, order)
    );
    const subject = locale === 'vi' ? `Mở lại đơn hàng ${order}` : `Open order ${order}`;
    const intro =
      locale === 'vi'
        ? `Dùng liên kết này để mở lại đơn hàng. Liên kết có thời hạn ${expires}.`
        : `Use this app link to reopen your order. It is valid for ${expires}.`;
    return messageShell(subject, intro, locale === 'vi' ? 'Mở đơn hàng' : 'Open order', link, locale === 'vi' ? 'Không chia sẻ liên kết này.' : 'Do not share this link.');
  }

  if (row.eventType === 'physical_shipped') {
    const carrier = stringValue(row.payload.carrier);
    const trackingNumber = stringValue(row.payload.trackingNumber);
    const trackingUrl = stringValue(row.payload.trackingUrl);
    const link = trackingUrl || absoluteUrl(siteUrl, orderPath(locale, order));
    const subject = locale === 'vi' ? `Đã gửi đơn hàng ${order}` : `Order ${order} shipped`;
    const intro =
      locale === 'vi'
        ? `Trạng thái vận chuyển đã cập nhật.${carrier ? ` Đơn vị: ${carrier}.` : ''}${trackingNumber ? ` Mã: ${trackingNumber}.` : ''}`
        : `Shipping status was updated.${carrier ? ` Carrier: ${carrier}.` : ''}${trackingNumber ? ` Tracking: ${trackingNumber}.` : ''}`;
    return messageShell(subject, intro, locale === 'vi' ? 'Xem vận chuyển' : 'View tracking', link, locale === 'vi' ? 'Cảm ơn bạn đã ủng hộ cửa hàng.' : 'Thank you for supporting the shop.');
  }

  if (row.eventType === 'order_created') {
    const totalMinor = typeof row.payload.totalMinor === 'number' ? row.payload.totalMinor : null;
    const currencyCode = row.payload.currencyCode === 'VND' || row.payload.currencyCode === 'USD' ? row.payload.currencyCode : null;
    const totalLabel = totalMinor !== null && currencyCode ? formatMoney({amountMinor: totalMinor, currencyCode}) : '';
    const deadline = row.payload.reservationExpiresAt;
    const deadlineLabel = typeof deadline === 'string' ? (formatPaymentDateTime(deadline, locale) ?? '') : '';
    const link = absoluteUrl(
      siteUrl,
      context.guestToken ? orderReopenPath(locale, order, context.guestToken) : orderPath(locale, order)
    );

    const rows = [
      {label: locale === 'vi' ? 'Tổng tiền' : 'Total', value: totalLabel},
      {label: locale === 'vi' ? 'Hạn thanh toán' : 'Payment deadline', value: deadlineLabel}
    ];
    if (context.vietqr) {
      rows.push(
        {label: locale === 'vi' ? 'Ngân hàng' : 'Bank', value: context.vietqr.bankId},
        {label: locale === 'vi' ? 'Chủ tài khoản' : 'Account name', value: context.vietqr.accountName},
        {label: locale === 'vi' ? 'Số tài khoản' : 'Account number', value: context.vietqr.accountNoMasked},
        {label: locale === 'vi' ? 'Nội dung chuyển khoản' : 'Transfer reference', value: order}
      );
    }

    const subject = locale === 'vi' ? `Đơn hàng ${order} đang chờ thanh toán` : `Order ${order} is awaiting payment`;
    const intro =
      locale === 'vi'
        ? 'Cảm ơn bạn đã đặt hàng. Đơn hàng đang chờ thanh toán — dưới đây là thông tin cần thiết.'
        : 'Thank you for your order. It is awaiting payment — here are the details you need.';
    const footer =
      locale === 'vi'
        ? 'Nếu bạn đã thanh toán, một email xác nhận riêng sẽ đến ngay khi chúng tôi ghi nhận.'
        : 'If you have already paid, a separate confirmation email will arrive once we record it.';

    return messageShellWithRows({
      subject,
      intro,
      rows,
      ctaLabel: locale === 'vi' ? 'Mở đơn hàng' : 'Open order',
      ctaLink: link,
      footer
    });
  }

  if (row.eventType === 'payment_received') {
    // Same rule as `order_created`: prefer a redeemable reopen link so the
    // customer can open the order on any device, not just the one that still
    // has the guest cookie.
    const totalMinor = typeof row.payload.totalMinor === 'number' ? row.payload.totalMinor : null;
    const currencyCode = row.payload.currencyCode === 'VND' || row.payload.currencyCode === 'USD' ? row.payload.currencyCode : null;
    const totalLabel = totalMinor !== null && currencyCode ? formatMoney({amountMinor: totalMinor, currencyCode}) : '';
    const hasDigital = row.payload.hasDigitalLines === true;
    const hasPhysical = row.payload.hasPhysicalLines === true;
    const link = absoluteUrl(
      siteUrl,
      context.guestToken ? orderReopenPath(locale, order, context.guestToken) : orderPath(locale, order)
    );

    const nextStep =
      locale === 'vi'
        ? hasDigital && hasPhysical
          ? 'File PDF sẽ được gửi qua một email riêng; sản phẩm handmade sẽ được đóng gói và gửi đi.'
          : hasDigital
            ? 'File PDF sẽ được gửi qua một email riêng trong ít phút tới.'
            : 'Sản phẩm handmade của bạn sẽ được đóng gói và gửi đi.'
        : hasDigital && hasPhysical
          ? 'Your PDF files will arrive in a separate email; your handmade items will be packed and shipped.'
          : hasDigital
            ? 'Your PDF files will arrive in a separate email shortly.'
            : 'Your handmade items will be packed and shipped.';

    const subject = locale === 'vi' ? `Đã nhận thanh toán cho đơn hàng ${order}` : `Payment received for order ${order}`;
    const intro =
      locale === 'vi'
        ? 'Chúng tôi đã ghi nhận thanh toán cho đơn hàng của bạn.'
        : 'We have recorded payment for your order.';

    return messageShellWithRows({
      subject,
      intro,
      rows: [{label: locale === 'vi' ? 'Tổng đã thanh toán' : 'Total paid', value: totalLabel}],
      ctaLabel: locale === 'vi' ? 'Xem đơn hàng' : 'View order',
      ctaLink: link,
      footer: nextStep
    });
  }

  const link = absoluteUrl(siteUrl, orderPath(locale, order));
  return messageShell(`Order ${order}`, `Order ${order} was updated.`, 'Open order', link, 'This message contains no attachments.');
}
