'use client';

import { useRef, type ReactNode } from 'react';
import { Menu, X } from 'lucide-react';
import { Dialog as SheetPrimitive } from 'radix-ui';
import { Button } from './button';
import { cn } from '@/lib/utils';

type SheetSide = 'left' | 'right';

export const SheetClose = SheetPrimitive.Close;

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
  triggerIcon,
  triggerVariant = 'secondary',
  contentClassName,
  headerClassName,
  bodyClassName,
  children
}: {
  triggerLabel: string;
  title: ReactNode;
  closeLabel?: string;
  showTriggerLabel?: boolean;
  side?: SheetSide;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  showTrigger?: boolean;
  triggerClassName?: string;
  triggerIcon?: ReactNode;
  triggerVariant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  contentClassName?: string;
  headerClassName?: string;
  bodyClassName?: string;
  children: ReactNode;
}) {
  const selectLayerInteractionRef = useRef(false);

  return (
    <SheetPrimitive.Root open={open} onOpenChange={onOpenChange}>
      {showTrigger ? (
        <SheetPrimitive.Trigger asChild>
          <Button
            variant={triggerVariant}
            className={cn('min-h-11 gap-2 px-3', triggerClassName)}
            title={showTriggerLabel ? undefined : triggerLabel}
          >
            {triggerIcon ?? <Menu aria-hidden="true" className="h-6 w-6" />}
            <span className={showTriggerLabel ? '' : 'sr-only'}>{triggerLabel}</span>
          </Button>
        </SheetPrimitive.Trigger>
      ) : null}
      <SheetPrimitive.Portal>
        <SheetPrimitive.Overlay
          className="sheet-overlay fixed inset-0 z-50 bg-[rgba(38,35,31,0.32)]"
          onPointerDownCapture={(event) => {
            const ownerDocument = event.currentTarget.ownerDocument;
            selectLayerInteractionRef.current = Boolean(
              ownerDocument.querySelector('[data-sheet-select-content][data-state="open"]')
            );
            if (selectLayerInteractionRef.current) {
              ownerDocument.defaultView?.setTimeout(() => {
                selectLayerInteractionRef.current = false;
              }, 0);
            }
          }}
        />
        <SheetPrimitive.Content
          data-side={side}
          onInteractOutside={(event) => {
            const target = event.target;
            if (
              selectLayerInteractionRef.current ||
              (target instanceof Element && target.closest('[data-sheet-select-content]'))
            ) {
              event.preventDefault();
            }
          }}
          className={cn(
            'sheet-content fixed bottom-0 top-0 z-50 flex h-dvh w-[min(420px,92vw)] flex-col overflow-hidden bg-[linear-gradient(180deg,var(--surface-paper),var(--surface))] shadow-[0_0_90px_rgb(73_52_32/24%)] outline-none ring-1 ring-white/60',
            side === 'left'
              ? 'left-0 border-r border-[var(--border)]/70'
              : 'right-0 border-l border-[var(--border)]/70',
            contentClassName
          )}
        >
          <div
            className={cn(
              'flex min-h-16 items-center justify-between gap-4 border-b border-[var(--border)]/65 bg-[var(--surface)]/72 px-5 py-4',
              headerClassName
            )}
          >
            <SheetPrimitive.Title className="min-w-0 text-lg font-semibold leading-none">
              {title}
            </SheetPrimitive.Title>
            <SheetPrimitive.Close asChild>
              <Button
                variant="ghost"
                className="h-11 min-h-11 w-11 shrink-0 rounded-[var(--radius-control)] !px-0 text-[var(--muted-foreground)] transition duration-200 hover:rotate-3 hover:bg-[var(--surface-muted)]/70 hover:text-[var(--foreground)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
              >
                <X aria-hidden="true" className="h-5 w-5 shrink-0" strokeWidth={1.7} />
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
