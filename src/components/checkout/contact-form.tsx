'use client';

import type {Locale} from '@/i18n/routing';

const copy = {
  en: {
    email: 'Email',
    paymentIntent: 'Payment method',
    paypal: 'PayPal',
    vietqr: 'VietQR bank transfer'
  },
  vi: {
    email: 'Email',
    paymentIntent: 'Phuong thuc thanh toan',
    paypal: 'PayPal',
    vietqr: 'Chuyen khoan VietQR'
  }
} as const;

export type CheckoutPaymentIntent = 'paypal_intent' | 'vietqr_intent';

export function ContactForm({
  locale,
  email,
  paymentIntent,
  onEmailChange,
  onPaymentIntentChange
}: {
  locale: Locale;
  email: string;
  paymentIntent: CheckoutPaymentIntent;
  onEmailChange: (email: string) => void;
  onPaymentIntentChange: (paymentIntent: CheckoutPaymentIntent) => void;
}) {
  const t = copy[locale];

  return (
    <div className="grid gap-4">
      <label className="space-y-2">
        <span className="font-semibold">{t.email}</span>
        <input
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
          className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3"
          inputMode="email"
          autoComplete="email"
          required
        />
      </label>
      <fieldset className="grid gap-2">
        <legend className="font-semibold">{t.paymentIntent}</legend>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="paymentIntent"
            checked={paymentIntent === 'paypal_intent'}
            onChange={() => onPaymentIntentChange('paypal_intent')}
          />
          <span>{t.paypal}</span>
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="paymentIntent"
            checked={paymentIntent === 'vietqr_intent'}
            onChange={() => onPaymentIntentChange('vietqr_intent')}
          />
          <span>{t.vietqr}</span>
        </label>
      </fieldset>
    </div>
  );
}
