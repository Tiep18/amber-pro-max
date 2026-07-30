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
      <form id="newsletter" onSubmit={form.handleSubmit(onSubmit)} className="grid w-full gap-4">
        <div className="grid gap-2">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">{labels.title}</h2>
          <p className="text-xs leading-relaxed text-[var(--muted-foreground)]">{labels.consent}</p>
        </div>
        <FormField
          control={form.control}
          name="email"
          render={({field}) => (
            <FormItem className="grid gap-1.5">
              <FormLabel className="sr-only">
                {labels.email}
              </FormLabel>
              <div className="flex items-stretch rounded-[var(--radius-control)] border border-[var(--border)]/60 bg-white/60 shadow-[inset_0_1px_0_rgb(255_255_255_/_60%)] transition-colors focus-within:border-[var(--accent)]/50 focus-within:bg-white/80 focus-within:ring-2 focus-within:ring-[var(--accent)]/12">
                <FormControl>
                  <Input
                    {...field}
                    type="email"
                    autoComplete="email"
                    placeholder={labels.email}
                    spellCheck={false}
                    maxLength={320}
                    className="min-h-[44px] flex-1 border-0 bg-transparent px-3 text-sm font-normal shadow-none ring-0 placeholder:text-[var(--muted-foreground)]/60 focus-visible:outline-none focus-visible:ring-0"
                  />
                </FormControl>
                <Button
                  type="submit"
                  disabled={pending}
                  className="m-[3px] min-h-[38px] shrink-0 cursor-pointer gap-1.5 rounded-[calc(var(--radius-control)-3px)] px-4 text-[13px] font-semibold shadow-[0_6px_16px_rgb(169_71_52_/_14%)] transition-all active:translate-y-px"
                >
                  <Mail aria-hidden="true" className="size-3.5" />
                  {pending ? labels.pending : labels.submit}
                </Button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        {state.status === 'subscribed' ? (
          <p role="status" className="text-[13px] font-medium text-emerald-700">{labels.success}</p>
        ) : null}
        {state.status === 'invalid' ? (
          <p role="status" className="text-[13px] font-medium text-amber-700">{labels.invalid}</p>
        ) : null}
        {state.status === 'error' ? (
          <p role="status" className="text-[13px] font-medium text-red-700">{labels.error}</p>
        ) : null}
      </form>
    </Form>
  );
}
