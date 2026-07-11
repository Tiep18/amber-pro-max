'use client';

import { useState } from 'react';
import { ChevronRight, FileText, LockKeyhole, RefreshCcw, ScrollText } from 'lucide-react';
import type { PolicyFormInitial } from '@/policies/queries';
import type { PolicyKind } from '@/policies/schemas';
import { AdminStatusPill } from '@/components/admin/admin-page';
import { cn } from '@/lib/utils';
import { PolicyForm, policyKindLabels } from './policy-form';

export const requiredPolicyKinds: PolicyKind[] = [
  'privacy',
  'terms_of_sale',
  'returns',
  'digital_downloads'
];

const icons = {
  privacy: LockKeyhole,
  terms_of_sale: ScrollText,
  returns: RefreshCcw,
  digital_downloads: FileText
};

export function PolicyWorkspace({ policies }: { policies: PolicyFormInitial[] }) {
  const [activeKind, setActiveKind] = useState<PolicyKind>('privacy');
  const initialByKind = new Map(policies.map((policy) => [policy.policyKind, policy]));
  const selector = (
    <nav aria-label="Policy pages" className="grid gap-1.5">
      {requiredPolicyKinds.map((kind) => {
        const policy = initialByKind.get(kind);
        const Icon = icons[kind];
        return (
          <button
            key={kind}
            type="button"
            onClick={() => setActiveKind(kind)}
            className={cn(
              'grid min-h-[68px] grid-cols-[auto_1fr_auto] items-center gap-3 rounded-[var(--radius-control)] border border-transparent px-3 py-2 text-left transition-colors',
              activeKind === kind
                ? 'border-[var(--border)] bg-[var(--surface-muted)] shadow-[inset_3px_0_0_var(--accent)]'
                : 'hover:bg-[var(--surface-muted)]/65'
            )}
          >
            <span className="grid size-9 place-items-center rounded-[var(--radius-control)] bg-[var(--accent-soft)] text-[var(--accent)]">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">{policyKindLabels[kind]}</span>
              <span className="mt-1 block text-xs text-[var(--muted-foreground)]">
                {policy ? 'Content configured' : 'Not created yet'}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <AdminStatusPill tone={policy?.status === 'published' ? 'success' : 'default'}>
                {policy?.status ?? 'draft'}
              </AdminStatusPill>
              <ChevronRight className="size-4 text-[var(--muted-foreground)]" aria-hidden="true" />
            </span>
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_304px]">
      <div className="rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3 lg:hidden">
        {selector}
      </div>
      <main className="min-w-0">
        {requiredPolicyKinds.map((kind) => (
          <div key={kind} hidden={activeKind !== kind}>
            <PolicyForm policyKind={kind} initialPolicy={initialByKind.get(kind)} />
          </div>
        ))}
      </main>
      <aside className="sticky top-20 hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-3 shadow-[0_10px_30px_rgba(92,48,26,0.06)] lg:block">
        <div className="border-b border-[var(--border)] px-2 pb-3 pt-1">
          <h2 className="font-semibold">Policy pages</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Switch pages without losing unsaved edits.
          </p>
        </div>
        <div className="pt-3">{selector}</div>
      </aside>
    </div>
  );
}
