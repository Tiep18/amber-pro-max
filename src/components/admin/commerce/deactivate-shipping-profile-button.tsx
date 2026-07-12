'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  deactivateShippingProfileAction,
  type DeactivateShippingProfileResult
} from '@/checkout/admin-shipping-actions';
import { Button } from '@/components/ui/button';

type DeactivateShippingProfileButtonProps = {
  profileId: string;
  profileName: string;
  disabled?: boolean;
  blockedReason?: string;
};

export function DeactivateShippingProfileButton({
  profileId,
  profileName,
  disabled,
  blockedReason
}: DeactivateShippingProfileButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<DeactivateShippingProfileResult | null>(null);

  return (
    <div className="grid justify-items-end gap-2">
      <Button
        type="button"
        variant="destructive"
        className="min-h-9 px-3 text-sm"
        disabled={Boolean(blockedReason) || disabled || pending}
        onClick={() => {
          const confirmed = window.confirm(
            `Deactivate "${profileName}"?\n\nExisting assignments stay in place, but checkout quotes will stop using this package type.`
          );
          if (!confirmed) {
            return;
          }
          startTransition(async () => {
            const actionResult = await deactivateShippingProfileAction(profileId);
            setResult(actionResult);
            if (actionResult.status === 'deactivated') {
              router.refresh();
            }
          });
        }}
      >
        Deactivate
      </Button>
      {blockedReason ? (
        <p className="max-w-64 text-left text-sm text-[var(--muted-foreground)] lg:text-right">
          {blockedReason}
        </p>
      ) : null}
      {result?.status === 'error' ? (
        <p className="text-sm text-[var(--destructive)]">
          Package type could not be deactivated.
        </p>
      ) : null}
    </div>
  );
}
