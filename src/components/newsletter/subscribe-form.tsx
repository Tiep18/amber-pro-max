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
      <form id="newsletter" onSubmit={form.handleSubmit(onSubmit)} className="grid w-full gap-5">
        <div className="grid gap-2">
          <p className="text-xl font-semibold tracking-[-0.015em] text-[var(--foreground)]">{labels.title}</p>
          <p className="max-w-[32rem] text-sm leading-7 text-[var(--muted-foreground)]">{labels.consent}</p>
        </div>
        <div className="grid gap-2">
          <FormField
            control={form.control}
            name="email"
            render={({field}) => (
              <FormItem className="grid gap-2">
                <FormLabel className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  {labels.email}
                </FormLabel>
                <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                  <div className="flex min-h-12 w-full items-center rounded-[var(--radius-control)] border border-[var(--border)]/70 bg-white/68 px-2 shadow-[inset_0_1px_0_rgb(255_255_255_/_76%)] transition-colors focus-within:border-[var(--accent)]/55 focus-within:bg-white/88">
                  <FormControl>
                    <Input
                      {...field}
                      type="email"
                      autoComplete="email"
                      spellCheck={false}
                      maxLength={320}
                      className="min-h-10 flex-1 border-0 bg-transparent px-2 font-normal shadow-none focus-visible:outline-none"
                    />
                  </FormControl>
                  </div>
                  <Button
                    type="submit"
                    disabled={pending}
                    className="min-h-12 w-full shrink-0 cursor-pointer gap-2 rounded-[var(--radius-control)] px-5 text-sm shadow-[0_10px_24px_rgb(169_71_52_/_16%)] transition-transform active:translate-y-px sm:w-auto"
                  >
                    <Mail aria-hidden="true" className="size-4" />
                    {pending ? labels.pending : labels.submit}
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {state.status === 'subscribed' ? <p role="status">{labels.success}</p> : null}
        {state.status === 'invalid' ? <p role="status">{labels.invalid}</p> : null}
        {state.status === 'error' ? <p role="status">{labels.error}</p> : null}
      </form>
    </Form>
  );
}
