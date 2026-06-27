'use client';

import type { ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { Button } from './button';
import { cn } from '@/lib/utils';

type SheetSide = 'left' | 'right';

export function Sheet({
  triggerLabel,
  title,
  closeLabel = 'Close menu',
  showTriggerLabel = false,
  side = 'right',
  open,
  onOpenChange,
  showTrigger = true,
  triggerClassName,
  contentClassName,
  headerClassName,
  bodyClassName,
  children
}: {
  triggerLabel: string;
  title: string;
  closeLabel?: string;
  showTriggerLabel?: boolean;
  side?: SheetSide;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  triggerClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {showTrigger ? (
        <SheetPrimitive.Trigger asChild>
          <Button variant="secondary" className={cn('min-h-11 gap-2 px-3', triggerClassName)}>
            <Menu aria-hidden="true" className="h-5 w-5" />
            <span className={showTriggerLabel ? '' : 'sr-only'}>{triggerLabel}</span>
          </Button>
        </SheetPrimitive.Trigger>
      ) : null}
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay className="fixed inset-0 z-50 bg-black/30 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <SheetPrimitive.Content
          className={cn(
            'fixed bottom-0 top-0 z-50 flex h-dvh w-[min(420px,92vw)] flex-col overflow-hidden border-[var(--border)] bg-[var(--surface)] shadow-2xl outline-none ring-1 ring-black/5 data-[state=closed]:animate-out data-[state=open]:animate-in',
            side === 'left'
              ? 'left-0 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left'
              : 'right-0 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right',
            contentClassName
          )}
        >
          <div
            className={cn(
              'flex min-h-16 items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4',
              headerClassName
            )}
          >
            <SheetPrimitive.Title className="text-lg font-semibold leading-none">
              {title}
            </SheetPrimitive.Title>
            <SheetPrimitive.Close asChild>
              <Button
                variant="ghost"
                className="h-9 min-h-9 w-9 rounded-full px-0 text-[var(--muted-foreground)]"
              >
                <X aria-hidden="true" className="h-5 w-5" />
                <span className="sr-only">{closeLabel}</span>
              </Button>
            </SheetPrimitive.Close>
          </div>
          <div className={cn('flex-1 overflow-y-auto p-5', bodyClassName)}>{children}</div>
        </SheetPrimitive.Content>
      </SheetPrimitive.Portal>
    </SheetPrimitive.Root>
  );
}
