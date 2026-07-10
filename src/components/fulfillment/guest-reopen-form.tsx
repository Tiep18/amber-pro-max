'use client';

import {startTransition, useActionState, useEffect, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {CheckCircle2, Clock3, Link2, Mail, ShieldCheck, UserPlus} from 'lucide-react';
import {requestGuestOrderClaimEmailAction, requestGuestOrderReopenAction} from '@/fulfillment/guest-order-actions';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {Form, FormControl, FormField, FormItem, FormLabel, FormMessage} from '@/components/ui/form';
import {Input} from '@/components/ui/input';
import {ToggleGroup, ToggleGroupItem} from '@/components/ui/toggle-group';

export type GuestReopenLabels = {
  title: string;
  intro: string;
  orderNumber: string;
  email: string;
  reopenSubmit: string;
  claimSubmit: string;
  genericSuccess: string;
};

const guestReopenFormSchema = z.object({
  orderNumber: z.string().trim().min(1, {message: 'Order number is required'}).max(80),
  email: z.string().trim().email({message: 'Invalid email address'})
});

type GuestReopenFormValues = z.infer<typeof guestReopenFormSchema>;

type GuestAccessIntent = 'reopen' | 'claim';

const copy = {
  en: {
    eyebrow: 'Guest order access',
    reopenLabel: 'Reopen order',
    reopenBody: 'Receive a fresh private link for an order placed without signing in.',
    claimLabel: 'Claim to account',
    claimBody: 'Attach a guest order to the account using the same checkout email.',
    trust: ['Generic response protects your order privacy', 'Fresh links expire after a short window', 'Use the email used during checkout'],
    cardTitle: 'Private order help',
    cardBody: 'We verify the order and email quietly, then send the next secure link if they match.',
    pending: 'Sending request'
  },
  vi: {
    eyebrow: 'Truy cap don khach',
    reopenLabel: 'Mo lai don',
    reopenBody: 'Nhan lien ket rieng moi cho don hang da mua khi chua dang nhap.',
    claimLabel: 'Gan vao tai khoan',
    claimBody: 'Gan don khach vao tai khoan dung cung email khi thanh toan.',
    trust: ['Phan hoi chung giup bao ve rieng tu don hang', 'Lien ket moi co thoi han ngan', 'Dung email da thanh toan don hang'],
    cardTitle: 'Ho tro don hang rieng tu',
    cardBody: 'Chung toi kiem tra don hang va email mot cach kin dao, roi gui lien ket an toan neu thong tin khop.',
    pending: 'Dang gui yeu cau'
  }
} as const;

export function GuestReopenForm({locale, labels}: {locale: Locale; labels: GuestReopenLabels}) {
  const [intent, setIntent] = useState<GuestAccessIntent>('reopen');
  const [reopenState, reopenAction, reopenPending] = useActionState(
    async (_state: {status: 'idle' | 'sent'}, formData: FormData): Promise<{status: 'idle' | 'sent'}> => {
      const res = await requestGuestOrderReopenAction(formData);
      return {status: res.status};
    },
    {status: 'idle' as const}
  );

  const [claimState, claimAction, claimPending] = useActionState(
    async (_state: {status: 'idle' | 'sent'}, formData: FormData): Promise<{status: 'idle' | 'sent'}> => {
      const res = await requestGuestOrderClaimEmailAction(formData);
      return {status: res.status};
    },
    {status: 'idle' as const}
  );

  const form = useForm<GuestReopenFormValues>({
    resolver: zodResolver(guestReopenFormSchema),
    defaultValues: {orderNumber: '', email: ''}
  });

  const t = copy[locale];
  const sent = reopenState.status === 'sent' || claimState.status === 'sent';
  const pending = reopenPending || claimPending;
  const submitLabel = intent === 'reopen' ? labels.reopenSubmit : labels.claimSubmit;

  useEffect(() => {
    if (sent) {
      form.reset();
    }
  }, [form, sent]);

  const onSubmit = (values: GuestReopenFormValues) => {
    const formData = new FormData();
    formData.append('orderNumber', values.orderNumber);
    formData.append('email', values.email);
    formData.append('locale', locale);
    startTransition(() => {
      if (intent === 'reopen') {
        reopenAction(formData);
      } else {
        claimAction(formData);
      }
    });
  };

  return (
    <section className="overflow-hidden rounded-[24px] border border-[var(--border)] bg-[var(--surface-paper)] shadow-[0_28px_90px_rgb(73_52_32/10%)]">
      <div className="grid lg:grid-cols-[minmax(0,0.86fr)_minmax(420px,1fr)]">
        <aside className="relative grid content-between gap-10 bg-[var(--surface-muted)] p-6 sm:p-8">
          <div className="absolute inset-0 opacity-[0.12] [background-image:linear-gradient(90deg,rgba(120,107,97,0.18)_1px,transparent_1px),linear-gradient(0deg,rgba(120,107,97,0.14)_1px,transparent_1px)] [background-size:40px_40px]" aria-hidden="true" />
          <div className="relative grid gap-4">
            <p className="text-xs font-semibold text-[var(--accent)]">{t.eyebrow}</p>
            <div className="grid gap-3">
              <h1 className="text-[32px] font-semibold leading-[1.05] sm:text-[42px]">{labels.title}</h1>
              <p className="max-w-[52ch] text-sm leading-6 text-[var(--muted-foreground)]">{labels.intro}</p>
            </div>
          </div>
          <div className="relative grid gap-3">
            {t.trust.map((item, index) => (
              <div key={item} className="grid grid-cols-[34px_1fr] items-center gap-3 rounded-[var(--radius-control)] bg-[var(--surface)]/72 p-3">
                <span className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-control)] bg-[var(--trust-surface)] text-[var(--trust-accent)]">
                  {index === 0 ? <ShieldCheck className="h-4 w-4" aria-hidden="true" /> : index === 1 ? <Clock3 className="h-4 w-4" aria-hidden="true" /> : <Mail className="h-4 w-4" aria-hidden="true" />}
                </span>
                <span className="text-sm font-medium leading-5">{item}</span>
              </div>
            ))}
          </div>
        </aside>

        <div className="grid gap-5 p-5 sm:p-7 lg:p-8">
          <div className="grid gap-2">
            <p className="text-sm font-semibold">{t.cardTitle}</p>
            <p className="text-sm leading-6 text-[var(--muted-foreground)]">{t.cardBody}</p>
          </div>

          <ToggleGroup
            type="single"
            value={intent}
            onValueChange={(value) => {
              if (value === 'reopen' || value === 'claim') setIntent(value);
            }}
            className="grid grid-cols-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-1"
            aria-label={locale === 'vi' ? 'Chon cach truy cap don' : 'Choose order access mode'}
          >
            <ToggleGroupItem value="reopen" className="min-h-11 gap-2">
              <Link2 className="h-4 w-4" aria-hidden="true" />
              {t.reopenLabel}
            </ToggleGroupItem>
            <ToggleGroupItem value="claim" className="min-h-11 gap-2">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              {t.claimLabel}
            </ToggleGroupItem>
          </ToggleGroup>

          <div className="rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm leading-6 text-[var(--muted-foreground)]">
            {intent === 'reopen' ? t.reopenBody : t.claimBody}
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
              <FormField
                control={form.control}
                name="orderNumber"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>{labels.orderNumber}</FormLabel>
                    <FormControl>
                      <Input {...field} autoComplete="off" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({field}) => (
                  <FormItem>
                    <FormLabel>{labels.email}</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" autoComplete="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={pending} className="min-h-11 gap-2 cursor-pointer">
                <Mail aria-hidden="true" className="size-4" />
                {pending ? t.pending : submitLabel}
              </Button>
              {sent ? (
                <Alert variant="success" className="flex items-start gap-3 text-sm leading-6">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{labels.genericSuccess}</span>
                </Alert>
              ) : null}
            </form>
          </Form>
        </div>
      </div>
    </section>
  );
}
