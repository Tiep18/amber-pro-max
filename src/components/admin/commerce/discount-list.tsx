'use client';

import { useMemo, useState } from 'react';
import { Search, TicketPercent } from 'lucide-react';
import { formatMoney, type CurrencyCode } from '@/catalog/money';
import { AdminEmptyState, AdminStatusPill } from '@/components/admin/admin-page';
import { Input } from '@/components/ui/input';
import { DisableDiscountCodeButton } from './disable-discount-code-button';

export type AdminDiscount = {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  percentage_bps: number | null;
  amount_minor: number | null;
  currency_code: CurrencyCode | null;
  market: 'vn' | 'intl' | null;
  minimum_subtotal_minor: number;
  usage_limit: number | null;
  used_count: number;
  active: boolean;
};

function marketLabel(discount: AdminDiscount) {
  if (discount.market === 'vn') return 'Vietnam';
  if (discount.market === 'intl') return 'International';
  return discount.discount_type === 'fixed' && discount.currency_code
    ? `All ${discount.currency_code} checkouts`
    : 'All markets';
}

function offerLabel(discount: AdminDiscount) {
  if (discount.discount_type === 'percentage') {
    return `${(discount.percentage_bps ?? 0) / 100}% off`;
  }
  return discount.currency_code
    ? `${formatMoney({ amountMinor: discount.amount_minor ?? 0, currencyCode: discount.currency_code })} off`
    : 'Fixed discount';
}

function minimumLabel(discount: AdminDiscount) {
  const currencyCode = discount.currency_code ?? (discount.market === 'vn' ? 'VND' : 'USD');
  if (discount.minimum_subtotal_minor === 0) return 'No minimum';
  return `Min. ${formatMoney({ amountMinor: discount.minimum_subtotal_minor, currencyCode })}`;
}

export function DiscountList({ discounts }: { discounts: AdminDiscount[] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [market, setMarket] = useState<'all' | 'vn' | 'intl' | 'global'>('all');

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return discounts.filter((discount) => {
      const matchesQuery =
        !normalized ||
        discount.code.toLowerCase().includes(normalized) ||
        discount.description.toLowerCase().includes(normalized);
      const matchesStatus =
        status === 'all' || (status === 'active' ? discount.active : !discount.active);
      const matchesMarket =
        market === 'all' ||
        (market === 'global' ? discount.market === null : discount.market === market);
      return matchesQuery && matchesStatus && matchesMarket;
    });
  }, [discounts, market, query, status]);

  return (
    <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.06)]">
      <div className="flex flex-col gap-3 border-b border-[var(--border)] px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <TicketPercent className="size-4 text-[var(--accent)]" aria-hidden="true" />
            <h2 className="font-semibold">Promotion queue</h2>
            <span className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold tabular-nums">
              {filtered.length}/{discounts.length}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-[var(--muted-foreground)]">
            Search and compare eligibility, usage, and availability.
          </p>
        </div>

        <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_140px_150px]">
          <label className="relative">
            <span className="sr-only">Search discount codes</span>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
              aria-hidden="true"
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search code or note"
              className="min-h-10 pl-9 text-sm"
            />
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as typeof status)}
              className="min-h-10 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by market</span>
            <select
              value={market}
              onChange={(event) => setMarket(event.target.value as typeof market)}
              className="min-h-10 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm"
            >
              <option value="all">All markets</option>
              <option value="global">Global</option>
              <option value="vn">Vietnam</option>
              <option value="intl">International</option>
            </select>
          </label>
        </div>
      </div>

      {filtered.length === 0 ? (
        <AdminEmptyState
          icon={TicketPercent}
          title={discounts.length ? 'No promotions match these filters.' : 'No discount codes yet.'}
          description={
            discounts.length
              ? 'Change the search, status, or market filter to see more codes.'
              : 'Create the first controlled promotion from the panel beside this queue.'
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)]/65 text-xs font-semibold uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-5 py-3">Code</th>
                <th className="px-4 py-3">Offer</th>
                <th className="px-4 py-3">Eligibility</th>
                <th className="px-4 py-3">Usage</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filtered.map((discount) => (
                <tr
                  key={discount.id}
                  className="transition-colors hover:bg-[var(--surface-muted)]/45"
                >
                  <td className="px-5 py-4 align-middle">
                    <div className="flex items-center gap-2">
                      <code className="font-semibold text-[var(--foreground)]">
                        {discount.code}
                      </code>
                      <AdminStatusPill tone={discount.active ? 'success' : 'default'}>
                        {discount.active ? 'Active' : 'Inactive'}
                      </AdminStatusPill>
                    </div>
                    <p className="mt-1 max-w-[280px] truncate text-xs text-[var(--muted-foreground)]">
                      {discount.description || 'No internal note'}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <p className="font-semibold">{offerLabel(discount)}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {discount.discount_type === 'percentage' ? 'Percentage' : 'Fixed amount'}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <p className="font-semibold">{marketLabel(discount)}</p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      {minimumLabel(discount)}
                    </p>
                  </td>
                  <td className="px-4 py-4 align-middle">
                    <p className="font-semibold tabular-nums">
                      {discount.used_count}
                      <span className="font-normal text-[var(--muted-foreground)]">
                        {discount.usage_limit ? ` / ${discount.usage_limit}` : ' / unlimited'}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">redemptions</p>
                  </td>
                  <td className="px-5 py-4 text-right align-middle">
                    <DisableDiscountCodeButton
                      discountId={discount.id}
                      code={discount.code}
                      disabled={!discount.active}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
