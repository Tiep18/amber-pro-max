'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { saveShippingRuleAction } from '@/checkout/admin-shipping-actions';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';

type ProfileOption = { id: string; name: string; active: boolean };

function minor(value: FormDataEntryValue | null, currency: 'USD' | 'VND') {
  const parsed = Number(
    String(value ?? '')
      .replace(/,/g, '')
      .trim()
  );
  return Number.isFinite(parsed) && parsed >= 0
    ? Math.round(parsed * (currency === 'USD' ? 100 : 1))
    : -1;
}

export function ShippingRuleSheet({ profiles }: { profiles: ProfileOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'exact_country' | 'fallback'>('exact_country');
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const activeProfiles = profiles.filter((profile) => profile.active);

  return (
    <>
      <Button
        type="button"
        className="min-h-10 gap-2 px-3 text-sm"
        disabled={!activeProfiles.length}
        onClick={() => {
          setResult(null);
          setOpen(true);
        }}
      >
        <Plus className="size-4" aria-hidden="true" /> Add rule
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        showTrigger={false}
        triggerLabel="Add destination rule"
        title="Add destination rule"
        closeLabel="Close destination rule form"
        contentClassName="!w-[min(520px,96vw)]"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const currency = String(form.get('currencyCode')) === 'VND' ? 'VND' : 'USD';
            startTransition(async () => {
              const action = await saveShippingRuleAction({
                profileId: form.get('profileId'),
                destinationKind: mode,
                countryCode:
                  mode === 'exact_country'
                    ? String(form.get('countryCode') ?? '').toUpperCase()
                    : null,
                currencyCode: currency,
                firstItemFeeMinor: minor(form.get('firstItemFee'), currency),
                additionalItemFeeMinor: minor(form.get('additionalItemFee'), currency),
                active: true
              });
              if (action.status === 'saved') {
                setOpen(false);
                router.refresh();
                return;
              }
              setResult(
                action.status === 'invalid'
                  ? 'Check the destination and fee fields.'
                  : 'The rule could not be saved.'
              );
            });
          }}
        >
          {result ? <Alert variant="destructive">{result}</Alert> : null}
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Parcel profile</span>
            <Select name="profileId">
              <SelectTrigger aria-label="Parcel profile">
                <SelectValue placeholder="Choose a profile" />
              </SelectTrigger>
              <SelectContent>
                {activeProfiles.map((profile) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Destination type</span>
            <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
              <SelectTrigger aria-label="Destination type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exact_country">Specific country</SelectItem>
                <SelectItem value="fallback">Other countries</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Country code</span>
            <Input
              name="countryCode"
              maxLength={2}
              placeholder="US"
              disabled={mode === 'fallback'}
              required={mode === 'exact_country'}
              className="uppercase"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Currency</span>
              <Select name="currencyCode" defaultValue="USD">
                <SelectTrigger aria-label="Currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="VND">VND</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="grid gap-2 sm:col-span-2">
              <span className="text-sm font-semibold">First item fee</span>
              <Input name="firstItemFee" inputMode="decimal" required />
            </label>
          </div>
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Additional item fee</span>
            <Input name="additionalItemFee" inputMode="decimal" required />
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving rule...' : 'Save destination rule'}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
