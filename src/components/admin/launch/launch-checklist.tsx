import { AlertTriangle, CheckCircle2, FileCheck2, Gauge, ListChecks } from 'lucide-react';
import { saveLaunchSettingsAction, type AdminLaunchReadinessResult } from '@/launch/settings';
import { AdminStatusPill } from '@/components/admin/admin-page';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export function LaunchChecklist({
  result
}: {
  result: Extract<AdminLaunchReadinessResult, { status: 'success' }>;
}) {
  const { settings, readiness } = result;
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

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(420px,1.1fr)]">
        <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.05)]">
          <header className="border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-2">
              <Gauge className="size-4 text-[var(--accent)]" aria-hidden="true" />
              <h2 className="font-semibold">Launch readiness</h2>
              <AdminStatusPill tone={blockedCount ? 'warning' : 'success'}>
                {blockedCount ? `${blockedCount} blocked` : 'Ready'}
              </AdminStatusPill>
            </div>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Every gate fails closed until its evidence is saved.
            </p>
          </header>
          <div className="divide-y divide-[var(--border)]">
            {readiness.gates.map((gate) => (
              <article
                key={gate.id}
                className="grid grid-cols-[auto_1fr_auto] items-start gap-3 px-5 py-4"
              >
                {gate.status === 'ready' ? (
                  <CheckCircle2
                    className="mt-0.5 size-5 text-[var(--success)]"
                    aria-hidden="true"
                  />
                ) : (
                  <AlertTriangle
                    className="mt-0.5 size-5 text-[var(--warning)]"
                    aria-hidden="true"
                  />
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

        <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.05)]">
          <header className="border-b border-[var(--border)] px-5 py-4">
            <div className="flex items-center gap-2">
              <FileCheck2 className="size-4 text-[var(--accent)]" aria-hidden="true" />
              <h2 className="font-semibold">Settings and evidence</h2>
            </div>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Record production decisions and sanitized UAT references.
            </p>
          </header>
          <form action={saveLaunchSettingsAction} className="grid gap-5 p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                Brand name
                <Input name="brandName" defaultValue={settings.brandName ?? ''} />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                Enabled countries
                <Input
                  name="enabledCountryCodes"
                  defaultValue={settings.enabledCountryCodes.join(', ')}
                  placeholder="VN, US"
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Tax stance
              <Textarea name="taxStance" defaultValue={settings.taxStance ?? ''} rows={3} />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Seller policy approval
              <Textarea
                name="sellerPolicyApproval"
                defaultValue={settings.sellerPolicyApproval ?? ''}
                rows={3}
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-semibold">
                PayPal sandbox evidence
                <Textarea
                  name="paypalSandboxEvidence"
                  defaultValue={settings.paypalSandboxEvidence ?? ''}
                  rows={4}
                />
              </label>
              <label className="grid gap-2 text-sm font-semibold">
                VietQR bank evidence
                <Textarea
                  name="vietqrBankEvidence"
                  defaultValue={settings.vietqrBankEvidence ?? ''}
                  rows={4}
                />
              </label>
            </div>
            <label className="grid gap-2 text-sm font-semibold">
              Critical E2E evidence
              <Textarea name="e2eEvidence" defaultValue={settings.e2eEvidence ?? ''} rows={3} />
            </label>
            <div className="grid gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/55 p-3 sm:grid-cols-2">
              <label
                htmlFor="monitoringReady"
                className="flex min-h-10 items-center gap-2 text-sm font-semibold"
              >
                <Checkbox
                  id="monitoringReady"
                  name="monitoringReady"
                  defaultChecked={settings.monitoringReady}
                />
                Monitoring ready
              </label>
              <label
                htmlFor="redactionReady"
                className="flex min-h-10 items-center gap-2 text-sm font-semibold"
              >
                <Checkbox
                  id="redactionReady"
                  name="redactionReady"
                  defaultChecked={settings.redactionReady}
                />
                Redaction ready
              </label>
            </div>
            <div className="flex justify-end border-t border-[var(--border)] pt-4">
              <Button type="submit" className="gap-2">
                <FileCheck2 className="size-4" aria-hidden="true" />
                Save launch settings
              </Button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
