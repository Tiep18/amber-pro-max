'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {disableDiscountCodeAction, type DisableDiscountCodeResult} from '@/checkout/admin-discount-actions';
import {Button} from '@/components/ui/button';

type DisableDiscountCodeButtonProps = {
  discountId: string;
  code: string;
  disabled?: boolean;
};

export function DisableDiscountCodeButton({discountId, code, disabled}: DisableDiscountCodeButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<DisableDiscountCodeResult | null>(null);

  return (
    <div className="grid justify-items-start gap-2">
      <Button
        type="button"
        variant="destructive"
        disabled={disabled || pending}
        onClick={() => {
          const confirmed = window.confirm(`Disable ${code}? Existing redemption history stays intact, but checkout quotes will stop applying this code.`);
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
        Disable
      </Button>
      {result?.status === 'error' ? (
        <p className="text-sm text-[var(--destructive)]">Discount code could not be disabled.</p>
      ) : null}
    </div>
  );
}
