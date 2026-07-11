'use client';

import { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { DiscountCodeForm } from './discount-code-form';

export function DiscountCreateSheet() {
  const [open, setOpen] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);

  return (
    <>
      <Button
        type="button"
        className="min-h-10 gap-2 px-3 text-sm"
        onClick={() => {
          setCreatedCode(null);
          setOpen(true);
        }}
      >
        {createdCode ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Plus className="size-4" aria-hidden="true" />
        )}
        {createdCode ? 'Discount created' : 'New discount'}
      </Button>

      <Sheet
        open={open}
        onOpenChange={setOpen}
        showTrigger={false}
        triggerLabel="New discount"
        title="Create discount"
        closeLabel="Close discount form"
        side="right"
        contentClassName="!w-[min(520px,96vw)]"
        headerClassName="px-5 sm:px-6"
        bodyClassName="p-5 sm:p-6"
      >
        <div className="mb-5 border-b border-[var(--border)] pb-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Build one controlled checkout rule. Short fields stay paired on larger screens.
          </p>
        </div>
        <DiscountCodeForm
          onCreated={({ code }) => {
            setCreatedCode(code);
            setOpen(false);
          }}
        />
      </Sheet>
    </>
  );
}
