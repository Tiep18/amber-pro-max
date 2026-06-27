'use client';

import type {ReactNode} from 'react';
import {useId, useState} from 'react';
import {Menu, X} from 'lucide-react';
import {Button} from './button';

export function Sheet({
  triggerLabel,
  title,
  closeLabel = 'Close menu',
  showTriggerLabel = false,
  children
}: {
  triggerLabel: string;
  title: string;
  closeLabel?: string;
  showTriggerLabel?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();

  return (
    <>
      <Button
        variant="secondary"
        className="min-h-11 gap-2 px-3 md:hidden"
        aria-expanded={open}
        aria-controls={titleId}
        onClick={() => setOpen(true)}
      >
        <Menu aria-hidden="true" className="h-5 w-5" />
        <span className={showTriggerLabel ? '' : 'sr-only'}>{triggerLabel}</span>
      </Button>
      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label={closeLabel}
            className="absolute inset-0 h-full w-full bg-black/20"
            onClick={() => setOpen(false)}
          />
          <aside
            aria-labelledby={titleId}
            className="absolute right-0 top-0 flex h-full w-[min(320px,90vw)] flex-col gap-6 border-l border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg"
          >
            <div className="flex items-center justify-between gap-4">
              <h2 id={titleId} className="text-xl font-semibold">
                {title}
              </h2>
              <Button variant="ghost" className="min-h-11 px-3" onClick={() => setOpen(false)}>
                <X aria-hidden="true" className="h-5 w-5" />
                <span className="sr-only">{closeLabel}</span>
              </Button>
            </div>
            {children}
          </aside>
        </div>
      ) : null}
    </>
  );
}
