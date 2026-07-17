'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Check, FileCheck2, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { saveLaunchSettingsAction } from '@/launch/actions';
import type { LaunchSettingsSnapshot } from '@/launch/gates';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';

export function LaunchSettingsSheet({ settings }: { settings: LaunchSettingsSnapshot }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function openSheet() {
    setSaved(false);
    setOpen(true);
  }

  return (
    <>
      <Button type="button" className="min-h-10 gap-2 px-3 text-sm" onClick={openSheet}>
        {saved ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Settings2 className="size-4" aria-hidden="true" />
        )}
        {saved ? 'Settings saved' : 'Edit settings'}
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        showTrigger={false}
        triggerLabel="Edit launch settings"
        title="Launch settings and evidence"
        closeLabel="Close launch settings"
        contentClassName="!w-[min(600px,96vw)]"
        headerClassName="px-5 sm:px-6"
        bodyClassName="p-5 sm:p-6"
      >
        <p className="mb-5 border-b border-[var(--border)] pb-4 text-sm text-[var(--muted-foreground)]">
          Record production decisions and sanitized UAT references. Readiness remains fail-closed
          until saved.
        </p>
        <form
          className="grid gap-5"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await saveLaunchSettingsAction(formData);
              if (result.status === 'error') {
                toast.error(
                  'Launch settings could not be saved. Check the connection and try again.'
                );
                return;
              }
              setSaved(true);
              toast.success('Launch settings saved.');
              setOpen(false);
              router.refresh();
            });
          }}
        >
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
          <Button type="submit" disabled={pending} className="w-full gap-2">
            <FileCheck2 className="size-4" aria-hidden="true" />
            {pending ? 'Saving settings...' : 'Save launch settings'}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
