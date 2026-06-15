'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {deactivateShippingProfileAction, type DeactivateShippingProfileResult} from '@/checkout/admin-shipping-actions';
import {Button} from '@/components/ui/button';

type DeactivateShippingProfileButtonProps = {
  profileId: string;
  profileName: string;
  disabled?: boolean;
};

export function DeactivateShippingProfileButton({profileId, profileName, disabled}: DeactivateShippingProfileButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<DeactivateShippingProfileResult | null>(null);

  return (
    <div className="grid justify-items-start gap-2">
      <Button
        type="button"
        variant="destructive"
        disabled={disabled || pending}
        onClick={() => {
          const confirmed = window.confirm(
            `Deactivate ${profileName}? Existing attachments stay in place, but checkout quotes will stop using this profile.`
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
      {result?.status === 'error' ? (
        <p className="text-sm text-[var(--destructive)]">Shipping profile could not be deactivated.</p>
      ) : null}
    </div>
  );
}
