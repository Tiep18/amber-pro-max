'use client';

import {useEffect, useMemo} from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';
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
    emailInvalid: 'Enter a valid email address.'
  },
  vi: {
    email: 'Email',
    paymentIntent: 'Phuong thuc thanh toan',
    paypal: 'PayPal',
    paypalHint: 'The quoc te hoac tai khoan PayPal.',
    vietqr: 'Chuyen khoan VietQR',
    vietqrHint: 'Chuyen khoan ngan hang thu cong cho don hang tai Viet Nam.',
    emailInvalid: 'Nhap dia chi email hop le.'
  }
} as const;

export type CheckoutPaymentIntent = 'paypal_intent' | 'vietqr_intent';
type ContactFormValues = {
  email: string;
  paymentIntent: CheckoutPaymentIntent;
};

export function ContactForm({
  locale,
  email,
  paymentIntent,
  onEmailChange,
  onPaymentIntentChange,
  onValidityChange,
  showValidation = false
}: {
  locale: Locale;
  email: string;
  paymentIntent: CheckoutPaymentIntent;
  onEmailChange: (email: string) => void;
  onPaymentIntentChange: (paymentIntent: CheckoutPaymentIntent) => void;
  onValidityChange?: (valid: boolean) => void;
  showValidation?: boolean;
}) {
  const t = copy[locale];
  const schema = useMemo(
    () =>
      z.object({
        email: z.string().trim().email({message: t.emailInvalid}),
        paymentIntent: z.enum(['paypal_intent', 'vietqr_intent'])
      }),
    [t.emailInvalid]
  );
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      email,
      paymentIntent
    }
  });
  const watchedEmail = form.watch('email');
  const watchedPaymentIntent = form.watch('paymentIntent');
  const paymentOptions: Array<{
    value: CheckoutPaymentIntent;
    title: string;
    body: string;
  }> = [
    {value: 'paypal_intent', title: t.paypal, body: t.paypalHint},
    {value: 'vietqr_intent', title: t.vietqr, body: t.vietqrHint}
  ];

  useEffect(() => {
    if (watchedEmail !== email) {
      onEmailChange(watchedEmail);
    }
  }, [email, onEmailChange, watchedEmail]);

  useEffect(() => {
    if (watchedPaymentIntent !== paymentIntent) {
      onPaymentIntentChange(watchedPaymentIntent);
    }
  }, [onPaymentIntentChange, paymentIntent, watchedPaymentIntent]);

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

        <FormField
          control={form.control}
          name="paymentIntent"
          render={({field}) => (
            <FormItem>
              <FormLabel>{t.paymentIntent}</FormLabel>
              <FormControl>
                <div className="grid gap-2 sm:grid-cols-2">
                  {paymentOptions.map((option) => {
                    const selected = field.value === option.value;
                    return (
                      <Button
                        key={option.value}
                        type="button"
                        variant={selected ? 'primary' : 'secondary'}
                        onClick={() => field.onChange(option.value)}
                        className="h-auto min-h-[76px] justify-start px-4 py-3 text-left"
                        aria-pressed={selected}
                      >
                        <span className="grid gap-1">
                          <span className="text-sm font-semibold">{option.title}</span>
                          <span className={selected ? 'text-xs font-medium text-white/80' : 'text-xs font-medium text-[var(--muted-foreground)]'}>
                            {option.body}
                          </span>
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
