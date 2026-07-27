'use client';

import {useEffect, useMemo} from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import type {CheckoutPaymentIntent} from '@/checkout/schemas';
import type {Locale} from '@/i18n/routing';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';

const copy = {
  en: {
    email: 'Email',
    paymentIntent: 'Payment method',
    paypal: 'PayPal',
    paypalHint: 'Card or PayPal balance for international checkout.',
    vietqr: 'VietQR bank transfer',
    vietqrHint: 'Manual bank transfer for Vietnam orders.',
    automatic: 'Selected automatically from the confirmed market and currency.',
    pending: 'Payment method will appear after your current total is ready.',
    emailInvalid: 'Enter a valid email address.'
  },
  vi: {
    email: 'Email',
    paymentIntent: 'Phuong thuc thanh toan',
    paypal: 'PayPal',
    paypalHint: 'The quoc te hoac tai khoan PayPal.',
    vietqr: 'Chuyen khoan VietQR',
    vietqrHint: 'Chuyen khoan ngan hang thu cong cho don hang tai Viet Nam.',
    automatic: 'Duoc chon tu dong theo thi truong va tien te da xac nhan.',
    pending: 'Phuong thuc thanh toan se hien thi sau khi tong tien san sang.',
    emailInvalid: 'Nhap dia chi email hop le.'
  }
} as const;

type ContactFormValues = {
  email: string;
};

export function ContactForm({
  locale,
  email,
  paymentIntent,
  onEmailChange,
  onValidityChange,
  showValidation = false
}: {
  locale: Locale;
  email: string;
  paymentIntent: CheckoutPaymentIntent | null;
  onEmailChange: (email: string) => void;
  onValidityChange?: (valid: boolean) => void;
  showValidation?: boolean;
}) {
  const t = copy[locale];
  const schema = useMemo(
    () =>
      z.object({
        email: z.string().trim().email({message: t.emailInvalid})
      }),
    [t.emailInvalid]
  );
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      email
    }
  });
  const watchedEmail = form.watch('email');
  const payment =
    paymentIntent === 'paypal_intent'
      ? {title: t.paypal, body: t.paypalHint}
      : paymentIntent === 'vietqr_intent'
        ? {title: t.vietqr, body: t.vietqrHint}
        : null;

  useEffect(() => {
    if (watchedEmail !== email) {
      onEmailChange(watchedEmail);
    }
  }, [email, onEmailChange, watchedEmail]);

  useEffect(() => {
    onValidityChange?.(form.formState.isValid);
  }, [form.formState.isValid, onValidityChange]);

  useEffect(() => {
    if (showValidation) {
      void form.trigger();
    }
  }, [form, showValidation]);

  return (
    <Form {...form}>
      <form onSubmit={(event) => event.preventDefault()} className="grid gap-4">
        <FormField
          control={form.control}
          name="email"
          render={({field}) => (
            <FormItem>
              <FormLabel>{t.email}</FormLabel>
              <FormControl>
                <Input {...field} inputMode="email" autoComplete="email" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-2">
          <p className="text-sm font-medium text-[var(--foreground)]">{t.paymentIntent}</p>
          <div
            data-testid="checkout-payment-method"
            aria-live="polite"
            className="min-h-[76px] rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--muted)] px-4 py-3"
          >
            {payment ? (
              <div className="grid gap-1">
                <p className="text-sm font-semibold text-[var(--foreground)]">{payment.title}</p>
                <p className="text-xs font-medium text-[var(--muted-foreground)]">{payment.body}</p>
                <p className="text-xs text-[var(--muted-foreground)]">{t.automatic}</p>
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">{t.pending}</p>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}
