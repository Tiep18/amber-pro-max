import { AlertTriangle, CheckCircle2, Gauge, ListChecks } from 'lucide-react';
import type { AdminLaunchReadinessResult } from '@/launch/settings';
import { AdminStatusPill } from '@/components/admin/admin-page';
import { cn } from '@/lib/utils';

export function LaunchChecklist({
  result
}: {
  result: Extract<AdminLaunchReadinessResult, { status: 'success' }>;
}) {
  const { readiness } = result;
  const readyCount = readiness.gates.filter((gate) => gate.status === 'ready').length;
  const blockedCount = readiness.gates.length - readyCount;
  const metrics = [
    {
      label: 'Readiness gates',
      value: readiness.gates.length,
      description: 'tracked checks',
      icon: ListChecks
    },
    { label: 'Ready', value: readyCount, description: 'passing checks', icon: CheckCircle2 },
    { label: 'Blocked', value: blockedCount, description: 'needs evidence', icon: AlertTriangle }
  ];
  return (
    <div className="grid gap-4">
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
      <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.05)]">
        <header className="flex flex-col gap-2 border-b border-[var(--border)] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="size-4 text-[var(--accent)]" aria-hidden="true" />
              <h2 className="font-semibold">Launch readiness checklist</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Every gate fails closed until its evidence is saved.
            </p>
          </div>
          <AdminStatusPill tone={blockedCount ? 'warning' : 'success'}>
            {blockedCount ? `${blockedCount} blocked` : 'Ready for launch'}
          </AdminStatusPill>
        </header>
        <div className="divide-y divide-[var(--border)]">
          {readiness.gates.map((gate) => (
            <article
              key={gate.id}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-3 px-5 py-4"
            >
              {gate.status === 'ready' ? (
                <CheckCircle2 className="mt-0.5 size-5 text-[var(--success)]" aria-hidden="true" />
              ) : (
                <AlertTriangle className="mt-0.5 size-5 text-[var(--warning)]" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <h3 className="font-semibold">{gate.label}</h3>
                <p className="mt-1 text-sm leading-5 text-[var(--muted-foreground)]">
                  {gate.reason}
                </p>
              </div>
              <AdminStatusPill tone={gate.status === 'ready' ? 'success' : 'warning'}>
                {gate.status === 'ready' ? 'Ready' : 'Blocked'}
              </AdminStatusPill>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
