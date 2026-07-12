'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { ShippingProfileForm } from './shipping-profile-form';

export function ShippingCreateSheet() {
  const [open, setOpen] = useState(false);
  const [created, setCreated] = useState(false);

  return (
    <>
      <Button
        type="button"
        className="min-h-10 gap-2 px-3 text-sm"
        onClick={() => {
          setCreated(false);
          setOpen(true);
        }}
      >
        {created ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Plus className="size-4" aria-hidden="true" />
        )}
        {created ? 'Package type created' : 'New package type'}
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        showTrigger={false}
        triggerLabel="New package type"
        title="Create package type"
        closeLabel="Close package type form"
        contentClassName="!w-[min(520px,96vw)] max-sm:!w-screen"
        headerClassName="px-5 sm:px-6"
        bodyClassName="p-5 sm:p-6"
      >
        <div className="mb-5 border-b border-[var(--border)] pb-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Create a reusable package group for products that share similar shipping fees.
          </p>
        </div>
        <ShippingProfileForm
          onCreated={() => {
            setCreated(true);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}
