'use client';

import {useEffect, useMemo, useRef} from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {z} from 'zod';
import type {Locale} from '@/i18n/routing';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';

const copy = {
  en: {
    email: 'Email',
    emailHint: 'We will send order and payment updates to this address.',
    emailInvalid: 'Enter a valid email address.'
  },
  vi: {
    email: 'Email',
    emailHint: 'Chúng tôi sẽ gửi cập nhật đơn hàng và thanh toán tới địa chỉ này.',
    emailInvalid: 'Nhập địa chỉ email hợp lệ.'
  }
} as const;

type ContactFormValues = {
  email: string;
};

export function ContactForm({
  locale,
  email,
  onEmailChange,
  onValidityChange,
  showValidation = false
}: {
  locale: Locale;
  email: string;
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
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      email
    }
  });
  const initialValidationDone = useRef(false);
  const watchedEmail = form.watch('email');

  useEffect(() => {
    if (watchedEmail !== email) {
      onEmailChange(watchedEmail);
    }
  }, [email, onEmailChange, watchedEmail]);

  useEffect(() => {
    if (!initialValidationDone.current && email.trim()) {
      initialValidationDone.current = true;
      void form.trigger('email');
    }
  }, [email, form]);

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
      <form onSubmit={(event) => event.preventDefault()} className="grid gap-2">
        <FormField
          control={form.control}
          name="email"
          render={({field}) => (
            <FormItem>
              <FormLabel>{t.email}</FormLabel>
              <FormControl>
                <Input id="checkout-email" {...field} inputMode="email" autoComplete="email" />
              </FormControl>
              <p className="text-xs leading-5 text-[var(--muted-foreground)]">{t.emailHint}</p>
              <FormMessage />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
