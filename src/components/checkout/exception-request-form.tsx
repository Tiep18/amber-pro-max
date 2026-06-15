'use client';

import {useState, useTransition} from 'react';
import {createExceptionRequestAction, type CreateExceptionRequestResult} from '@/checkout/exception-actions';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';

const copy = {
  en: {
    title: 'Request exception',
    email: 'Email',
    productId: 'Product ID',
    variantId: 'Variant ID',
    country: 'Destination country',
    note: 'Note',
    submit: 'Send request',
    pending: 'Sending',
    created: 'Request received. No inventory has been reserved.',
    invalid: 'Check the request details.'
  },
  vi: {
    title: 'Yeu cau ngoai le',
    email: 'Email',
    productId: 'Ma san pham',
    variantId: 'Ma tuy chon',
    country: 'Quoc gia giao hang',
    note: 'Ghi chu',
    submit: 'Gui yeu cau',
    pending: 'Dang gui',
    created: 'Da nhan yeu cau. Chua co hang nao duoc giu.',
    invalid: 'Kiem tra thong tin yeu cau.'
  }
} as const;

export function ExceptionRequestForm({locale}: {locale: Locale}) {
  const t = copy[locale];
  const [result, setResult] = useState<CreateExceptionRequestResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          const actionResult = await createExceptionRequestAction({
            locale,
            market: locale === 'vi' ? 'vn' : 'intl',
            contactEmail: formData.get('email'),
            productId: formData.get('productId'),
            variantId: formData.get('variantId') || null,
            destinationCountryCode: String(formData.get('countryCode') ?? '').toUpperCase(),
            customerNote: formData.get('note') ?? ''
          });
          setResult(actionResult);
          if (actionResult.status === 'created') {
            form.reset();
          }
        });
      }}
    >
      {result?.status === 'created' ? <Alert variant="success">{t.created}</Alert> : null}
      {result && result.status !== 'created' ? <Alert variant="destructive">{t.invalid}</Alert> : null}
      <label className="space-y-2">
        <span className="font-semibold">{t.email}</span>
        <input name="email" inputMode="email" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" />
      </label>
      <label className="space-y-2">
        <span className="font-semibold">{t.productId}</span>
        <input name="productId" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" />
      </label>
      <label className="space-y-2">
        <span className="font-semibold">{t.variantId}</span>
        <input name="variantId" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" />
      </label>
      <label className="space-y-2">
        <span className="font-semibold">{t.country}</span>
        <input name="countryCode" maxLength={2} className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 uppercase" />
      </label>
      <label className="space-y-2">
        <span className="font-semibold">{t.note}</span>
        <textarea name="note" className="min-h-24 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2" />
      </label>
      <Button type="submit" disabled={pending}>{pending ? t.pending : t.submit}</Button>
    </form>
  );
}
