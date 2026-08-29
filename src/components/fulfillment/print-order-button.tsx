'use client';

import { Printer } from 'lucide-react';

export function PrintOrderButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
    >
      <Printer className="size-3.5 text-[var(--muted-foreground)]" aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
