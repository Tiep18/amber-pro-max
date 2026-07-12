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
type DestinationChoice = 'VN' | 'US' | 'fallback' | 'custom';

const destinationChoices: Array<{
  value: DestinationChoice;
  label: string;
  description: string;
}> = [
  { value: 'VN', label: 'Vietnam', description: 'Domestic shipping in VND' },
  { value: 'US', label: 'United States', description: 'US checkout shipping in USD' },
  { value: 'fallback', label: 'Other countries', description: 'Fallback for countries without a dedicated row' },
  { value: 'custom', label: 'Custom country', description: 'Use an ISO 2-letter country code' }
];

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
  const [destinationChoice, setDestinationChoice] = useState<DestinationChoice>('US');
  const [currency, setCurrency] = useState<'USD' | 'VND'>('USD');
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const activeProfiles = profiles.filter((profile) => profile.active);
  const mode = destinationChoice === 'fallback' ? 'fallback' : 'exact_country';

  return (
    <>
      <Button
        type="button"
        className="min-h-10 gap-2 px-3 text-sm"
        disabled={!activeProfiles.length}
        onClick={() => {
          setResult(null);
          setDestinationChoice('US');
          setCurrency('USD');
          setOpen(true);
        }}
      >
        <Plus className="size-4" aria-hidden="true" /> Add shipping fee
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        showTrigger={false}
        triggerLabel="Add shipping fee"
        title="Add shipping fee"
        closeLabel="Close shipping fee form"
        contentClassName="!w-[min(520px,96vw)] max-sm:!w-screen"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const selectedCurrency = String(form.get('currencyCode')) === 'VND' ? 'VND' : 'USD';
            const countryCode =
              destinationChoice === 'custom'
                ? String(form.get('countryCode') ?? '').toUpperCase()
                : destinationChoice === 'fallback'
                  ? null
                  : destinationChoice;
            startTransition(async () => {
              const action = await saveShippingRuleAction({
                profileId: form.get('profileId'),
                destinationKind: mode,
                countryCode,
                currencyCode: selectedCurrency,
                firstItemFeeMinor: minor(form.get('firstItemFee'), selectedCurrency),
                additionalItemFeeMinor: minor(form.get('additionalItemFee'), selectedCurrency),
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
                  : 'The shipping fee could not be saved.'
              );
            });
          }}
        >
          {result ? <Alert variant="destructive">{result}</Alert> : null}
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Package type</span>
            <Select name="profileId">
              <SelectTrigger aria-label="Package type">
                <SelectValue placeholder="Choose a package type" />
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
            <span className="text-sm font-semibold">Shipping destination</span>
            <Select
              value={destinationChoice}
              onValueChange={(value) => {
                const nextChoice = value as DestinationChoice;
                setDestinationChoice(nextChoice);
                setCurrency(nextChoice === 'VN' ? 'VND' : 'USD');
              }}
            >
              <SelectTrigger aria-label="Shipping destination">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {destinationChoices.map((choice) => (
                  <SelectItem key={choice.value} value={choice.value}>
                    {choice.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-[var(--muted-foreground)]">
              {destinationChoices.find((choice) => choice.value === destinationChoice)?.description}
            </span>
          </label>
          {destinationChoice === 'custom' ? (
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Country code</span>
              <Input
                name="countryCode"
                maxLength={2}
                placeholder="JP"
                required
                className="uppercase"
              />
            </label>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Currency</span>
              <Select name="currencyCode" value={currency} onValueChange={(value) => setCurrency(value as typeof currency)}>
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
            {pending ? 'Saving shipping fee...' : 'Save shipping fee'}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
