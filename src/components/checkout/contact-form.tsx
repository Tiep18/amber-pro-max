'use client';

import {useEffect, useMemo, useRef} from 'react';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {createTranslator} from 'next-intl';
import {z} from 'zod';
import {suggestEmailCorrection} from '@/checkout/email-suggestion';
import type {Locale} from '@/i18n/routing';
import enMessages from '@/messages/en.json';
import viMessages from '@/messages/vi.json';
import {Button} from '@/components/ui/button';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';

type ContactFormValues = {
  email: string;
};

export function ContactForm({
  locale,
  email,
  onEmailChange,
  onValidityChange,
  showValidation = false,
  disabled = false
}: {
  locale: Locale;
  email: string;
  onEmailChange: (email: string) => void;
  onValidityChange?: (valid: boolean) => void;
  showValidation?: boolean;
  disabled?: boolean;
}) {
  const translate = createTranslator({
    locale,
    messages: locale === 'vi' ? viMessages : enMessages,
    namespace: 'checkout.contact'
  });
  const t = {
    email: translate('email'),
    emailHint: translate('emailHint'),
    emailInvalid: translate('emailInvalid'),
    suggestion: (suggested: string) => translate('suggestion', {email: suggested}),
    useSuggestion: translate('useSuggestion')
  };
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
  // A domain we merely *suspect* is mistyped must never nag mid-typing:
  // `a@gmial.co` is a valid address on its way to becoming `a@gmial.com`.
  // Waiting for the first blur (or a submit attempt) keeps the hint to the
  // moment the customer has actually finished the field.
  const emailTouched = Boolean(form.formState.touchedFields.email);
  // Applying the suggestion makes it stop matching, so the hint clears itself
  // without any dismissed-state bookkeeping to get out of sync.
  const visibleSuggestion =
    form.formState.isValid && (emailTouched || showValidation)
      ? suggestEmailCorrection(watchedEmail)
      : null;

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
                <Input id="checkout-email" {...field} disabled={disabled} inputMode="email" autoComplete="email" />
              </FormControl>
              <p className="text-xs leading-5 text-[var(--muted-foreground)]">{t.emailHint}</p>
              <FormMessage />
            </FormItem>
          )}
        />
        <div role="status" aria-live="polite" className="empty:hidden">
          {visibleSuggestion ? (
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/55 px-3 py-2 text-sm leading-5">
              <span className="min-w-0 break-words">{t.suggestion(visibleSuggestion)}</span>
              <Button
                type="button"
                variant="ghost"
                disabled={disabled}
                className="min-h-11 shrink-0 px-2 text-sm font-semibold text-[var(--accent)]"
                onClick={() => {
                  form.setValue('email', visibleSuggestion, {
                    shouldValidate: true,
                    shouldDirty: true,
                    shouldTouch: true
                  });
                }}
              >
                {t.useSuggestion}
              </Button>
            </div>
          ) : null}
        </div>
      </form>
    </Form>
  );
}
