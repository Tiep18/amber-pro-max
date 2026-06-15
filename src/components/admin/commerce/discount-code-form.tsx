'use client';

import {useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {createDiscountCodeAction, type CreateDiscountCodeResult} from '@/checkout/admin-discount-actions';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';

export function DiscountCodeForm() {
  const router = useRouter();
  const [result, setResult] = useState<CreateDiscountCodeResult | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        startTransition(async () => {
          const actionResult = await createDiscountCodeAction(formData);
          setResult(actionResult);
          if (actionResult.status === 'created') {
            form.reset();
            router.refresh();
          }
        });
      }}
    >
      {result?.status === 'created' ? <Alert variant="success">Discount code created.</Alert> : null}
      {result?.status === 'invalid' ? <Alert variant="destructive">Check the discount fields.</Alert> : null}
      {result?.status === 'error' ? <Alert variant="destructive">Discount code could not be created.</Alert> : null}
      <label className="space-y-2">
        <span className="font-semibold">Code</span>
        <input name="code" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 uppercase" />
      </label>
      <label className="space-y-2">
        <span className="font-semibold">Description</span>
        <textarea name="description" className="min-h-20 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 py-2" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="font-semibold">Discount type</span>
          <select name="discountType" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-white px-3">
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Market</span>
          <select name="market" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-white px-3">
            <option value="all">All markets</option>
            <option value="vn">Vietnam</option>
            <option value="intl">International</option>
          </select>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="font-semibold">Percentage</span>
          <input name="percentage" inputMode="decimal" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" />
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Fixed amount</span>
          <input name="amount" inputMode="decimal" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="font-semibold">Currency</span>
          <select name="currencyCode" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-white px-3">
            <option value="USD">USD</option>
            <option value="VND">VND</option>
          </select>
        </label>
        <label className="space-y-2">
          <span className="font-semibold">Minimum subtotal</span>
          <input name="minimumSubtotal" inputMode="decimal" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" />
        </label>
      </div>
      <label className="space-y-2">
        <span className="font-semibold">Usage limit</span>
        <input name="usageLimit" inputMode="numeric" className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3" />
      </label>
      <Button type="submit" disabled={pending}>Create discount</Button>
    </form>
  );
}
