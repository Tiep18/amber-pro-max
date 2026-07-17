'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Ban, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { disableDiscountCodeAction } from '@/checkout/admin-discount-actions';
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
            if (actionResult.status === 'disabled') {
              toast.success('Discount code disabled.');
              router.refresh();
            } else {
              toast.error('Discount code could not be disabled.');
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
    </div>
  );
}
