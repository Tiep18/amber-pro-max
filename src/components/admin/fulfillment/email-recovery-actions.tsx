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

function RetryEmailButton({ emailId, expectedVersion }: { emailId: string; expectedVersion: number }) {
  const [, formAction, pending] = useActionState(retryAction, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="emailId" value={emailId} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      <Button type="submit" variant="secondary" className="gap-2" disabled={pending}>
        <RefreshCcw aria-hidden="true" className="size-4" />
        {pending ? 'Queuing retry…' : 'Retry email'}
      </Button>
    </form>
  );
}

function ResendDownloadButton({
  entitlementId,
  expectedVersion
}: {
  entitlementId: string;
  expectedVersion: number;
}) {
  const [, formAction, pending] = useActionState(resendAction, initialState);
  return (
    <form action={formAction}>
      <input type="hidden" name="entitlementId" value={entitlementId} />
      <input type="hidden" name="expectedVersion" value={expectedVersion} />
      <Button type="submit" className="gap-2" disabled={pending}>
        <Send aria-hidden="true" className="size-4" />
        {pending ? 'Queuing email…' : 'Resend download email'}
      </Button>
    </form>
  );
}

export function EmailRecoveryActions({
  emailId,
  emailVersion,
  entitlementId,
  entitlementVersion
}: {
  emailId: string;
  emailVersion: number;
  entitlementId: string | null;
  entitlementVersion: number | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <RetryEmailButton emailId={emailId} expectedVersion={emailVersion} />
      {entitlementId && entitlementVersion !== null ? (
        <ResendDownloadButton
          entitlementId={entitlementId}
          expectedVersion={entitlementVersion}
        />
      ) : null}
    </div>
  );
}
