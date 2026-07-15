'use client';

import type { ReactNode } from 'react';
import { Dialog } from 'radix-ui';
import { Button } from '@/components/ui/button';

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  cancelLabel = 'Cancel',
  pending = false,
  destructive = false,
  onConfirm
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  destructive?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !pending && onOpenChange(nextOpen)}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-[rgba(38,35,31,0.42)]" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-[61] grid w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 gap-5 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_24px_80px_rgb(73_52_32/24%)] focus:outline-none sm:p-6">
          <div className="grid gap-2">
            <Dialog.Title className="text-lg font-semibold">{title}</Dialog.Title>
            <Dialog.Description asChild>
              <div className="text-sm leading-6 text-[var(--muted-foreground)]">{description}</div>
            </Dialog.Description>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Dialog.Close asChild>
              <Button type="button" variant="secondary" disabled={pending}>
                {cancelLabel}
              </Button>
            </Dialog.Close>
            <Button
              type="button"
              variant={destructive ? 'destructive' : 'primary'}
              disabled={pending}
              onClick={onConfirm}
            >
              {pending ? (pendingLabel ?? 'Working…') : confirmLabel}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
