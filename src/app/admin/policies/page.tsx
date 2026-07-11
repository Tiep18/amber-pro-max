import { CircleCheck, FileWarning, ScrollText } from 'lucide-react';
import { requireAdmin } from '@/auth/guards';
import { AdminPageHeader, AdminPageShell } from '@/components/admin/admin-page';
import { PolicyWorkspace, requiredPolicyKinds } from '@/components/admin/policies/policy-workspace';
import { getAdminPolicyForms } from '@/policies/queries';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function AdminPoliciesPage() {
  await requireAdmin({ next: '/admin/policies' });
  const policies = await getAdminPolicyForms();
  const publishedCount = policies.filter((policy) => policy.status === 'published').length;
  const metrics = [
    {
      label: 'Required policies',
      value: requiredPolicyKinds.length,
      description: 'launch-critical pages',
      icon: ScrollText
    },
    { label: 'Published', value: publishedCount, description: 'currently live', icon: CircleCheck },
    {
      label: 'Needs attention',
      value: requiredPolicyKinds.length - publishedCount,
      description: 'draft or missing',
      icon: FileWarning
    }
  ];
  return (
    <AdminPageShell>
      <AdminPageHeader
        eyebrow="Admin policies"
        title="Policy publishing"
        description="Maintain bilingual customer trust and compliance copy."
      />
      <section className="grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_24px_rgba(92,48,26,0.05)] sm:grid-cols-3">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={cn(
                'grid min-h-[104px] grid-cols-[1fr_auto] items-start gap-4 px-5 py-4',
                index > 0 && 'border-t border-[var(--border)] sm:border-l sm:border-t-0'
              )}
            >
              <div className="grid h-full content-between gap-2">
                <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                  {metric.label}
                </p>
                <div>
                  <p className="text-3xl font-semibold leading-none tabular-nums">{metric.value}</p>
                  <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                    {metric.description}
                  </p>
                </div>
              </div>
              <span className="grid size-9 place-items-center rounded-[var(--radius-control)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
          );
        })}
      </section>
      <PolicyWorkspace policies={policies} />
    </AdminPageShell>
  );
}
