import {AlertTriangle, CheckCircle2, ListChecks} from 'lucide-react';
import {saveLaunchSettingsAction, type AdminLaunchReadinessResult} from '@/launch/settings';
import {Button} from '@/components/ui/button';
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card';

function fieldClass() {
  return 'min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2';
}

export function LaunchChecklist({result}: {result: Extract<AdminLaunchReadinessResult, {status: 'success'}>}) {
  const {settings, readiness} = result;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <ListChecks className="h-5 w-5 text-[var(--accent)]" aria-hidden="true" />
          <CardTitle>Launch readiness checklist</CardTitle>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Store enabled countries, tax stance, seller decisions, provider/manual UAT evidence, E2E evidence, and monitoring/redaction readiness as fail-closed launch gates.
        </p>
      </CardHeader>
      <CardContent className="grid gap-6">
        <div className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {readiness.gates.map((gate) => (
            <div key={gate.id} className="grid gap-2 py-4 sm:grid-cols-[auto_1fr]">
              {gate.status === 'ready' ? (
                <CheckCircle2 className="mt-1 h-5 w-5 text-[#2f6b4f]" aria-hidden="true" />
              ) : (
                <AlertTriangle className="mt-1 h-5 w-5 text-[#8a5a16]" aria-hidden="true" />
              )}
              <div>
                <p className="font-semibold">
                  {gate.label}: {gate.status === 'ready' ? 'Ready' : 'Blocked'}
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">{gate.reason}</p>
              </div>
            </div>
          ))}
        </div>

        <form action={saveLaunchSettingsAction} className="grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Brand name</span>
              <input name="brandName" defaultValue={settings.brandName ?? ''} className={fieldClass()} />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Enabled countries</span>
              <input
                name="enabledCountryCodes"
                defaultValue={settings.enabledCountryCodes.join(', ')}
                className={fieldClass()}
                placeholder="VN, US"
              />
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Tax stance</span>
            <textarea name="taxStance" defaultValue={settings.taxStance ?? ''} className={fieldClass()} rows={3} />
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Seller policy approval</span>
            <textarea
              name="sellerPolicyApproval"
              defaultValue={settings.sellerPolicyApproval ?? ''}
              className={fieldClass()}
              rows={3}
            />
          </label>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">PayPal sandbox evidence</span>
              <textarea
                name="paypalSandboxEvidence"
                defaultValue={settings.paypalSandboxEvidence ?? ''}
                className={fieldClass()}
                rows={3}
              />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold">VietQR bank evidence</span>
              <textarea
                name="vietqrBankEvidence"
                defaultValue={settings.vietqrBankEvidence ?? ''}
                className={fieldClass()}
                rows={3}
              />
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Critical E2E evidence</span>
            <textarea name="e2eEvidence" defaultValue={settings.e2eEvidence ?? ''} className={fieldClass()} rows={3} />
          </label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" name="monitoringReady" defaultChecked={settings.monitoringReady} />
              Monitoring ready
            </label>
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" name="redactionReady" defaultChecked={settings.redactionReady} />
              Redaction ready
            </label>
          </div>
          <Button type="submit" className="w-fit">
            Save launch settings
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
