import Link from 'next/link';
import {ArrowRight, CircleAlert, CircleCheck, MailMinus} from 'lucide-react';
import type {NewsletterUnsubscribeResult} from '@/newsletter/consent';

export function UnsubscribeResult({
  result,
  subscribeAgainHref,
  labels
}: {
  result: NewsletterUnsubscribeResult;
  subscribeAgainHref: string;
  labels: {
    unsubscribedTitle: string;
    unsubscribedBody: string;
    unavailableTitle: string;
    unavailableBody: string;
    invalidTitle: string;
    invalidBody: string;
    errorTitle: string;
    errorBody: string;
    subscribeAgain: string;
  };
}) {
  const content = result.status === 'unsubscribed'
    ? {title: labels.unsubscribedTitle, body: labels.unsubscribedBody, success: true}
    : result.status === 'unavailable'
      ? {title: labels.unavailableTitle, body: labels.unavailableBody, success: false}
      : result.status === 'invalid'
        ? {title: labels.invalidTitle, body: labels.invalidBody, success: false}
        : {title: labels.errorTitle, body: labels.errorBody, success: false};
  const Icon = content.success ? CircleCheck : CircleAlert;

  return (
    <main className="container grid min-h-[60vh] content-center py-10 sm:py-12">
      <section className="mx-auto grid w-full max-w-[760px] gap-6 rounded-[24px] border border-[var(--border)] bg-[var(--surface-paper)] p-6 shadow-[0_28px_90px_rgb(73_52_32/10%)] sm:p-8">
        <div className="flex items-start gap-4">
          <span
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-control)] ${
              content.success ? 'bg-[var(--success-surface)] text-[var(--success)]' : 'bg-[var(--warning-surface)] text-[var(--warning)]'
            }`}
          >
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div className="grid gap-3">
            <p className="flex items-center gap-2 text-xs font-semibold text-[var(--accent)]">
              <MailMinus className="h-4 w-4" aria-hidden="true" />
              Newsletter
            </p>
            <h1 className="text-[34px] font-semibold leading-tight sm:text-[42px]">{content.title}</h1>
            <p className="max-w-[58ch] text-sm leading-6 text-[var(--muted-foreground)]">{content.body}</p>
          </div>
        </div>
        <Link
          href={subscribeAgainHref}
          className="inline-flex min-h-11 w-fit items-center gap-2 rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
        >
          {labels.subscribeAgain}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </section>
    </main>
  );
}
