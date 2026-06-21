import Link from 'next/link';
import {CircleAlert, CircleCheck} from 'lucide-react';
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
    <main className="mx-auto grid min-h-[60vh] w-full max-w-[720px] content-center gap-5 px-4 py-12 sm:px-6">
      <Icon aria-hidden="true" className={`size-8 ${content.success ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`} />
      <div className="grid gap-2">
        <h1 className="text-3xl font-semibold">{content.title}</h1>
        <p className="text-[var(--muted-foreground)]">{content.body}</p>
      </div>
      <Link
        href={subscribeAgainHref}
        className="inline-flex min-h-11 w-fit items-center rounded-[var(--radius-control)] bg-[var(--accent)] px-4 py-2 font-semibold text-white"
      >
        {labels.subscribeAgain}
      </Link>
    </main>
  );
}
