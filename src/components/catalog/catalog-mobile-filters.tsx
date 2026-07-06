'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { Sheet } from '@/components/ui/sheet';

export function CatalogMobileFilters({
  triggerLabel,
  title,
  closeLabel,
  children
}: {
  triggerLabel: string;
  title: string;
  closeLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet
      open={open}
      onOpenChange={setOpen}
      triggerLabel={triggerLabel}
      title={title}
      closeLabel={closeLabel}
      showTriggerLabel
      triggerIcon={<SlidersHorizontal aria-hidden="true" className="h-4 w-4" />}
      triggerClassName="!h-10 !min-h-10 gap-1.5 px-3 text-sm shadow-sm"
      contentClassName="w-[min(360px,92vw)]"
      bodyClassName="p-4"
    >
      <div
        onClickCapture={(event) => {
          if (event.target instanceof Element && event.target.closest('a[href]')) {
            setOpen(false);
          }
        }}
      >
        {children}
      </div>
    </Sheet>
  );
}
