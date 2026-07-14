'use client';

import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmationDialog } from '@/components/ui/confirmation-dialog';
import { Sheet } from '@/components/ui/sheet';
import { ShippingProfileForm, type ShippingProfileDraft } from './shipping-profile-form';

function DiscardDialog({
  open,
  onOpenChange,
  onDiscard
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDiscard: () => void;
}) {
  return (
    <ConfirmationDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Discard package changes?"
      description="The package type has unsaved changes. Closing now will discard them."
      confirmLabel="Discard changes"
      destructive
      onConfirm={onDiscard}
    />
  );
}

function ProfileSheet({
  profile,
  open,
  setOpen,
  onSaved
}: {
  profile?: ShippingProfileDraft;
  open: boolean;
  setOpen: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const [dirty, setDirty] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const editing = Boolean(profile);

  function requestOpen(nextOpen: boolean) {
    if (!nextOpen && dirty) {
      setConfirmDiscard(true);
      return;
    }
    setOpen(nextOpen);
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={requestOpen}
        showTrigger={false}
        triggerLabel={editing ? 'Edit package type' : 'New package type'}
        title={editing ? `Edit ${profile!.name}` : 'Create package type'}
        closeLabel={editing ? 'Close package type editor' : 'Close package type form'}
        contentClassName="!w-[min(520px,96vw)] max-sm:!w-screen"
        headerClassName="px-5 sm:px-6"
        bodyClassName="p-5 sm:p-6"
      >
        <div className="mb-5 border-b border-[var(--border)] pb-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            {editing
              ? 'Update the internal package group. Destination fees are edited from the rate cells.'
              : 'Create a reusable package group, then add its Vietnam, US, and fallback rates.'}
          </p>
        </div>
        <ShippingProfileForm
          profile={profile}
          onDirtyChange={setDirty}
          onSaved={() => {
            setDirty(false);
            setOpen(false);
            onSaved?.();
          }}
        />
      </Sheet>
      <DiscardDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        onDiscard={() => {
          setConfirmDiscard(false);
          setDirty(false);
          setOpen(false);
        }}
      />
    </>
  );
}

export function ShippingCreateSheet() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button type="button" className="min-h-11 gap-2 px-3 text-sm" onClick={() => setOpen(true)}>
        <Plus className="size-4" aria-hidden="true" />
        New package type
      </Button>
      <ProfileSheet open={open} setOpen={setOpen} />
    </>
  );
}

export function ShippingProfileEditSheet({ profile }: { profile: ShippingProfileDraft }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="min-h-11 gap-2 px-3 text-sm"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-4" aria-hidden="true" />
        Edit package
      </Button>
      <ProfileSheet profile={profile} open={open} setOpen={setOpen} />
    </>
  );
}
