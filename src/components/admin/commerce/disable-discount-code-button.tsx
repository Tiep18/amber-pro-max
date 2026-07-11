'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Loader2 } from 'lucide-react';
import {
  disableDiscountCodeAction,
  type DisableDiscountCodeResult
} from '@/checkout/admin-discount-actions';
import { Button } from '@/components/ui/button';

type DisableDiscountCodeButtonProps = {
  discountId: string;
  code: string;
  disabled?: boolean;
};

export function DisableDiscountCodeButton({
  discountId,
  code,
  disabled
}: DisableDiscountCodeButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<DisableDiscountCodeResult | null>(null);

  return (
    <div className="grid justify-items-end gap-1.5">
      <Button
        type="button"
        variant="secondary"
        disabled={disabled || pending}
        className="min-h-9 gap-2 px-3 text-sm text-[var(--destructive)]"
        onClick={() => {
          const confirmed = window.confirm(
            `Disable ${code}? Existing redemption history stays intact, but checkout quotes will stop applying this code.`
          );
          if (!confirmed) {
            return;
          }
          startTransition(async () => {
            const actionResult = await disableDiscountCodeAction(discountId);
            setResult(actionResult);
            if (actionResult.status === 'disabled') {
              router.refresh();
            }
          });
        }}
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Ban className="size-3.5" aria-hidden="true" />
        )}
        {disabled ? 'Inactive' : pending ? 'Disabling...' : 'Disable'}
      </Button>
      {result?.status === 'error' ? (
        <p className="text-sm text-[var(--destructive)]">Discount code could not be disabled.</p>
      ) : null}
    </div>
  );
}
