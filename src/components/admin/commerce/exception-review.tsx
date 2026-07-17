'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  approveExceptionRequestAction,
  rejectExceptionRequestAction,
  type ApproveExceptionRequestResult
} from '@/checkout/exception-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export function ExceptionReview({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [result, setResult] = useState<ApproveExceptionRequestResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="grid justify-items-end gap-2">
      {result?.status === 'approved' ? (
        <Alert variant="success">
          Approved. Token: <span className="break-all font-mono">{result.token}</span>
        </Alert>
      ) : null}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          className="min-h-9 px-3 text-sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const actionResult = await approveExceptionRequestAction({
                requestId,
                shippingFeeMinor: 0,
                currencyCode: 'USD'
              });
              if (actionResult.status === 'approved') {
                setResult(actionResult);
                toast.success('Exception request approved.');
                router.refresh();
              } else {
                toast.error('Exception request could not be approved.');
              }
            })
          }
        >
          Approve
        </Button>
        <Button
          variant="secondary"
          className="min-h-9 px-3 text-sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const actionResult = await rejectExceptionRequestAction({
                requestId,
                reason: 'Unavailable for this destination'
              });
              if (actionResult.status === 'rejected') {
                setResult(null);
                toast.success('Exception request rejected.');
                router.refresh();
              } else {
                toast.error('Exception request could not be rejected.');
              }
            })
          }
        >
          Reject
        </Button>
      </div>
    </div>
  );
}
