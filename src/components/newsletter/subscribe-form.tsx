'use client';

import {useActionState} from 'react';
import {useFormStatus} from 'react-dom';
import {Mail} from 'lucide-react';
import {subscribeNewsletterAction} from '@/newsletter/actions';
import type {NewsletterSubscribeResult} from '@/newsletter/consent';
import type {Locale} from '@/i18n/routing';
import {Button} from '@/components/ui/button';

const initialState: NewsletterSubscribeResult = {status: 'idle'};

function SubmitButton({label, pendingLabel}: {label: string; pendingLabel: string}) {
  const {pending} = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="gap-2 whitespace-nowrap">
      <Mail aria-hidden="true" className="size-4" />
      {pending ? pendingLabel : label}
    </Button>
  );
}

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
  const [state, action] = useActionState(subscribeNewsletterAction, initialState);

  return (
    <form id="newsletter" action={action} className="grid w-full max-w-xl gap-2">
      <input type="hidden" name="locale" value={locale} />
      <p className="font-semibold text-[var(--foreground)]">{labels.title}</p>
      <p>{labels.consent}</p>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="grid gap-1 font-semibold text-[var(--foreground)]">
          {labels.email}
          <input
            required
            type="email"
            name="email"
            autoComplete="email"
            maxLength={320}
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 font-normal"
          />
        </label>
        <SubmitButton label={labels.submit} pendingLabel={labels.pending} />
      </div>
      {state.status === 'subscribed' ? <p role="status">{labels.success}</p> : null}
      {state.status === 'invalid' ? <p role="status">{labels.invalid}</p> : null}
      {state.status === 'error' ? <p role="status">{labels.error}</p> : null}
    </form>
  );
}
