'use client';

import { useActionState } from 'react';
import { RefreshCcw, Send } from 'lucide-react';
import { toast } from 'sonner';
import {
  resendDownloadEmailServerAction,
  retryTransactionalEmailServerAction
} from '@/fulfillment/admin-email-server-actions';
import type { AdminEmailActionResult } from '@/fulfillment/admin-email-actions';
import { Button } from '@/components/ui/button';

type EmailState = AdminEmailActionResult | { status: 'idle' };
const initialState: EmailState = { status: 'idle' };

function notifyEmailResult(result: AdminEmailActionResult, action: 'retry' | 'resend') {
  if (result.status === 'queued') {
    toast.success(action === 'retry' ? 'Email retry queued.' : 'Download email queued.');
  } else if (result.status === 'stale') {
    toast.warning('This email is no longer available for retry.');
  } else if (result.status === 'invalid') {
    toast.error('The email recovery request is invalid.');
  } else {
    toast.error('The email recovery action could not be completed.');
  }
}

async function retryAction(_: EmailState, formData: FormData): Promise<EmailState> {
  const result = await retryTransactionalEmailServerAction(formData);
  notifyEmailResult(result, 'retry');
  return result;
}

async function resendAction(_: EmailState, formData: FormData): Promise<EmailState> {
  const result = await resendDownloadEmailServerAction(formData);
  notifyEmailResult(result, 'resend');
  return result;
}

function RetryEmailButton({ emailId }: { emailId: string }) {
  const [, formAction, pending] = useActionState(retryAction, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="emailId" value={emailId} />
      <Button type="submit" variant="secondary" className="gap-2" disabled={pending}>
        <RefreshCcw aria-hidden="true" className="size-4" />
        {pending ? 'Queuing retry…' : 'Retry email'}
      </Button>
    </form>
  );
}

function ResendDownloadButton({
  orderId,
  orderNumber,
  entitlementId,
  locale
}: {
  orderId: string;
  orderNumber: string;
  entitlementId: string;
  locale: string;
}) {
  const [, formAction, pending] = useActionState(resendAction, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="orderId" value={orderId} />
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="entitlementId" value={entitlementId} />
      <input type="hidden" name="locale" value={locale} />
      <Button type="submit" className="gap-2" disabled={pending}>
        <Send aria-hidden="true" className="size-4" />
        {pending ? 'Queuing email…' : 'Resend download email'}
      </Button>
    </form>
  );
}

export function EmailRecoveryActions({
  emailId,
  orderId,
  orderNumber,
  entitlementId,
  locale
}: {
  emailId: string;
  orderId: string | null;
  orderNumber: string;
  entitlementId: string | null;
  locale: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <RetryEmailButton emailId={emailId} />
      {entitlementId ? (
        <ResendDownloadButton
          orderId={orderId ?? ''}
          orderNumber={orderNumber}
          entitlementId={entitlementId}
          locale={locale}
        />
      ) : null}
    </div>
  );
}
