import type {TransactionalEmailEventType} from '@/fulfillment/schemas';

type Locale = 'en' | 'vi';

export type TransactionalEmailRow = {
  id: string;
  eventType: TransactionalEmailEventType;
  recipientEmail: string;
  locale: Locale;
  orderId: string | null;
  entitlementId: string | null;
  payload: Record<string, unknown>;
};

export type TransactionalEmailRenderContext = {
  siteUrl: string;
  downloadToken?: string | null;
  guestToken?: string | null;
  expiresAt?: Date | string | null;
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

function downloadPath(order: string, token?: string | null) {
  const params = new URLSearchParams({orderNumber: order});
  if (token) {
    params.set('token', token);
  }
  return `/api/downloads?${params.toString()}`;
}

function hoursCopy(locale: Locale, hours: unknown) {
  const value = typeof hours === 'number' && Number.isFinite(hours) ? hours : 24;
  return locale === 'vi' ? `${value} gio` : `${value} hours`;
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

export function renderTransactionalEmail(row: TransactionalEmailRow, context: TransactionalEmailRenderContext): RenderedTransactionalEmail {
  const locale = row.locale === 'vi' ? 'vi' : 'en';
  const order = orderNumber(row);
  const siteUrl = context.siteUrl;
  const expires = hoursCopy(locale, row.payload.expiresInHours);

  if (row.eventType === 'digital_access_granted' || row.eventType === 'digital_access_reissued') {
    const link = absoluteUrl(siteUrl, downloadPath(order, context.downloadToken));
    const subject = locale === 'vi' ? `Mau PDF cho don hang ${order}` : `Your PDF pattern for order ${order}`;
    const intro =
      locale === 'vi'
        ? `Mau PDF da thanh toan san sang. Lien ket nay co thoi han ${expires}.`
        : `Your paid PDF pattern is ready. This app link is valid for ${expires}.`;
    const footer =
      locale === 'vi'
        ? 'Lien ket se kiem tra lai quyen truy cap truoc khi tao tep tai xuong rieng.'
        : 'The app rechecks your access before creating a private download link.';
    return messageShell(subject, intro, locale === 'vi' ? 'Tai PDF' : 'Download PDF', link, footer);
  }

  if (row.eventType === 'guest_order_reopen' || row.eventType === 'guest_order_claim') {
    const link = absoluteUrl(siteUrl, orderPath(locale, order, context.guestToken));
    const subject = locale === 'vi' ? `Mo lai don hang ${order}` : `Open order ${order}`;
    const intro =
      locale === 'vi'
        ? `Dung lien ket nay de mo lai don hang. Lien ket co thoi han ${expires}.`
        : `Use this app link to reopen your order. It is valid for ${expires}.`;
    return messageShell(subject, intro, locale === 'vi' ? 'Mo don hang' : 'Open order', link, locale === 'vi' ? 'Khong chia se lien ket nay.' : 'Do not share this link.');
  }

  if (row.eventType === 'physical_shipped') {
    const carrier = stringValue(row.payload.carrier);
    const trackingNumber = stringValue(row.payload.trackingNumber);
    const trackingUrl = stringValue(row.payload.trackingUrl);
    const link = trackingUrl || absoluteUrl(siteUrl, orderPath(locale, order));
    const subject = locale === 'vi' ? `Da gui don hang ${order}` : `Order ${order} shipped`;
    const intro =
      locale === 'vi'
        ? `Trang thai van chuyen da cap nhat.${carrier ? ` Don vi: ${carrier}.` : ''}${trackingNumber ? ` Ma: ${trackingNumber}.` : ''}`
        : `Shipping status was updated.${carrier ? ` Carrier: ${carrier}.` : ''}${trackingNumber ? ` Tracking: ${trackingNumber}.` : ''}`;
    return messageShell(subject, intro, locale === 'vi' ? 'Xem van chuyen' : 'View tracking', link, locale === 'vi' ? 'Cam on ban da ung ho cua hang.' : 'Thank you for supporting the shop.');
  }

  const link = absoluteUrl(siteUrl, orderPath(locale, order));
  return messageShell(`Order ${order}`, `Order ${order} was updated.`, 'Open order', link, 'This message contains no attachments.');
}
