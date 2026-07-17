'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Power, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { setShippingProfileActiveAction } from '@/checkout/admin-shipping-actions';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';

type ShippingProfileAvailabilityButtonProps = {
  profileId: string;
  profileName: string;
  active?: boolean;
  assignmentCount?: number;
  /** @deprecated Use active instead. Kept for the legacy profile list. */
  disabled?: boolean;
  blockedReason?: string;
  compact?: boolean;
};

export function DeactivateShippingProfileButton({
  profileId,
  profileName,
  active: activeProp,
  assignmentCount = 0,
  disabled,
  blockedReason,
  compact = false
}: ShippingProfileAvailabilityButtonProps) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const active = activeProp ?? !disabled;
  const nextActive = !active;

  function updateAvailability() {
    startTransition(async () => {
      const actionResult = await setShippingProfileActiveAction(profileId, nextActive);
      if (actionResult.status === 'activated' || actionResult.status === 'deactivated') {
        toast.success(
          actionResult.status === 'activated'
            ? 'Package type reactivated.'
            : 'Package type deactivated.'
        );
        setConfirmOpen(false);
        router.refresh();
      } else {
        toast.error(
          nextActive
            ? 'Package type could not be reactivated.'
            : 'Package type could not be deactivated. Choose another default first and try again.'
        );
      }
    });
  }

  if (!active) {
    return (
      <div className="grid gap-1.5">
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 gap-2 px-3 text-sm"
          disabled={pending}
          onClick={updateAvailability}
        >
          <RotateCcw className="size-4" aria-hidden="true" />
          {pending ? 'Reactivating…' : 'Reactivate'}
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-1.5">
      <Button
        type="button"
        variant="ghost"
        className="min-h-11 gap-2 px-3 text-sm text-[var(--destructive)]"
        disabled={Boolean(blockedReason) || pending}
        title={blockedReason}
        onClick={() => setConfirmOpen(true)}
      >
        <Power className="size-4" aria-hidden="true" />
        Deactivate
      </Button>
      {blockedReason && !compact ? (
        <p className="max-w-72 text-sm text-[var(--muted-foreground)]">{blockedReason}</p>
      ) : null}
      <ConfirmationDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`Deactivate “${profileName}”?`}
        description={
          <>
            Checkout will stop using this package type and its rates.{' '}
            <strong className="text-[var(--foreground)]">
              {assignmentCount} product or variant assignment{assignmentCount === 1 ? '' : 's'}
            </strong>{' '}
            will remain attached and need review.
          </>
        }
        confirmLabel="Deactivate package type"
        pending={pending}
        destructive
        onConfirm={updateAvailability}
      />
    </div>
  );
}
