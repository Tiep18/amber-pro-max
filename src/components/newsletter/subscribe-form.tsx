'use client';

import {startTransition, useActionState, useEffect} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Mail} from 'lucide-react';
import {subscribeNewsletterAction} from '@/newsletter/actions';
import type {NewsletterSubscribeResult} from '@/newsletter/consent';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';

const initialState: NewsletterSubscribeResult = {status: 'idle'};

const subscribeSchema = z.object({
  email: z.string().trim().email({message: 'Invalid email address'}).max(320),
  locale: z.enum(['vi', 'en'])
});

export function SubscribeForm({
  locale,
  labels
}: {
  locale: Locale;
  labels: {
    title: string;
    consent: string;
    email: string;
    submit: string;
    pending: string;
    success: string;
    invalid: string;
    error: string;
  };
}) {
  const [state, action, pending] = useActionState(subscribeNewsletterAction, initialState);

  const form = useForm<z.infer<typeof subscribeSchema>>({
    resolver: zodResolver(subscribeSchema),
    defaultValues: {
      email: '',
      locale
    }
  });

  useEffect(() => {
    if (state.status === 'subscribed') {
      form.reset({email: '', locale});
    }
  }, [state, form, locale]);

  const onSubmit = (values: z.infer<typeof subscribeSchema>) => {
    const formData = new FormData();
    formData.append('email', values.email);
    formData.append('locale', values.locale);
    startTransition(() => {
      action(formData);
    });
  };

  return (
    <Form {...form}>
      <form id="newsletter" onSubmit={form.handleSubmit(onSubmit)} className="grid w-full max-w-xl gap-2">
        <p className="font-semibold text-[var(--foreground)]">{labels.title}</p>
        <p>{labels.consent}</p>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <FormField
            control={form.control}
            name="email"
            render={({field}) => (
              <FormItem className="grid gap-1">
                <FormLabel className="font-semibold text-[var(--foreground)]">{labels.email}</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    maxLength={320}
                    className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 font-normal"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={pending} className="gap-2 whitespace-nowrap min-h-11 cursor-pointer">
            <Mail aria-hidden="true" className="size-4" />
            {pending ? labels.pending : labels.submit}
          </Button>
        </div>
        {state.status === 'subscribed' ? <p role="status">{labels.success}</p> : null}
        {state.status === 'invalid' ? <p role="status">{labels.invalid}</p> : null}
        {state.status === 'error' ? <p role="status">{labels.error}</p> : null}
      </form>
    </Form>
  );
}
