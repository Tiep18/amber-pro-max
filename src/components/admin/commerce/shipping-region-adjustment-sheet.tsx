'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { saveShippingRegionAdjustmentAction } from '@/checkout/admin-shipping-actions';
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

const US_REGIONS = [
  ['AL', 'Alabama'],
  ['AK', 'Alaska'],
  ['AS', 'American Samoa'],
  ['AZ', 'Arizona'],
  ['AR', 'Arkansas'],
  ['CA', 'California'],
  ['CO', 'Colorado'],
  ['CT', 'Connecticut'],
  ['DE', 'Delaware'],
  ['DC', 'District of Columbia'],
  ['FL', 'Florida'],
  ['GA', 'Georgia'],
  ['GU', 'Guam'],
  ['HI', 'Hawaii'],
  ['ID', 'Idaho'],
  ['IL', 'Illinois'],
  ['IN', 'Indiana'],
  ['IA', 'Iowa'],
  ['KS', 'Kansas'],
  ['KY', 'Kentucky'],
  ['LA', 'Louisiana'],
  ['ME', 'Maine'],
  ['MD', 'Maryland'],
  ['MH', 'Marshall Islands'],
  ['MA', 'Massachusetts'],
  ['MI', 'Michigan'],
  ['FM', 'Micronesia'],
  ['MN', 'Minnesota'],
  ['MS', 'Mississippi'],
  ['MO', 'Missouri'],
  ['MT', 'Montana'],
  ['NE', 'Nebraska'],
  ['NV', 'Nevada'],
  ['NH', 'New Hampshire'],
  ['NJ', 'New Jersey'],
  ['NM', 'New Mexico'],
  ['NY', 'New York'],
  ['NC', 'North Carolina'],
  ['ND', 'North Dakota'],
  ['MP', 'Northern Mariana Islands'],
  ['OH', 'Ohio'],
  ['OK', 'Oklahoma'],
  ['OR', 'Oregon'],
  ['PW', 'Palau'],
  ['PA', 'Pennsylvania'],
  ['PR', 'Puerto Rico'],
  ['RI', 'Rhode Island'],
  ['SC', 'South Carolina'],
  ['SD', 'South Dakota'],
  ['TN', 'Tennessee'],
  ['TX', 'Texas'],
  ['UT', 'Utah'],
  ['VT', 'Vermont'],
  ['VI', 'Virgin Islands'],
  ['VA', 'Virginia'],
  ['WA', 'Washington'],
  ['WV', 'West Virginia'],
  ['WI', 'Wisconsin'],
  ['WY', 'Wyoming']
] as const;
type RuleOption = {
  id: string;
  label: string;
  currencyCode: 'USD' | 'VND';
  countryCode: string | null;
};

function fee(value: FormDataEntryValue | null) {
  const number = Number(
    String(value ?? '')
      .replace(/,/g, '')
      .trim()
  );
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) : -1;
}

export function ShippingRegionAdjustmentSheet({ rules }: { rules: RuleOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'surcharge' | 'replace'>('surcharge');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const eligibleRules = rules.filter(
    (rule) => rule.currencyCode === 'USD' && rule.countryCode === 'US'
  );
  return (
    <>
      <Button
        type="button"
        variant="secondary"
        className="min-h-10 gap-2 px-3 text-sm"
        disabled={!eligibleRules.length}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        <Plus className="size-4" aria-hidden="true" /> Add US adjustment
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        showTrigger={false}
        triggerLabel="Add US region adjustment"
        title="Add US region adjustment"
        closeLabel="Close US adjustment form"
        contentClassName="!w-[min(520px,96vw)] max-sm:!w-screen"
      >
        <form
          className="grid gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            startTransition(async () => {
              const result = await saveShippingRegionAdjustmentAction({
                shippingRuleId: form.get('shippingRuleId'),
                countryCode: 'US',
                regionCode: form.get('regionCode'),
                mode,
                firstItemFeeMinor: fee(form.get('firstItemFee')),
                additionalItemFeeMinor: fee(form.get('additionalItemFee')),
                active: true
              });
              if (result.status === 'saved') {
                setOpen(false);
                router.refresh();
                return;
              }
              setError(
                result.status === 'invalid'
                  ? 'Check the selected region and fees.'
                  : 'The adjustment could not be saved.'
              );
            });
          }}
        >
          {error ? <Alert variant="destructive">{error}</Alert> : null}
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Destination rule</span>
            <Select name="shippingRuleId">
              <SelectTrigger aria-label="Destination rule">
                <SelectValue placeholder="Choose a US rule" />
              </SelectTrigger>
              <SelectContent>
                {eligibleRules.map((rule) => (
                  <SelectItem key={rule.id} value={rule.id}>
                    {rule.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold">State or territory</span>
            <Select name="regionCode">
              <SelectTrigger aria-label="State or territory">
                <SelectValue placeholder="Choose a state or territory" />
              </SelectTrigger>
              <SelectContent>
                {US_REGIONS.map(([code, name]) => (
                  <SelectItem key={code} value={code}>
                    {name} ({code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <label className="grid gap-2">
            <span className="text-sm font-semibold">Adjustment type</span>
            <Select value={mode} onValueChange={(value) => setMode(value as typeof mode)}>
              <SelectTrigger aria-label="Adjustment type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="surcharge">Add surcharge</SelectItem>
                <SelectItem value="replace">Replace shipping fee</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2">
              <span className="text-sm font-semibold">First item</span>
              <Input name="firstItemFee" inputMode="decimal" required />
            </label>
            <label className="grid gap-2">
              <span className="text-sm font-semibold">Each additional item</span>
              <Input name="additionalItemFee" inputMode="decimal" required />
            </label>
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? 'Saving adjustment...' : 'Save US adjustment'}
          </Button>
        </form>
      </Sheet>
    </>
  );
}
