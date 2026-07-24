'use client';

import {formatMoney} from '@/catalog/money';
import type {
  CartMarketChangeFact,
  CartMarketGroupedChanges
} from '@/cart/market-sync';
import type {CartQuote} from '@/checkout/types';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';

const copy = {
  en: {
    updated: (count: number, attention: number) =>
      `Cart updated. ${count} items changed; ${attention} need your attention.`,
    unavailable: 'Unavailable',
    removed: 'Removed from current offer',
    repriced: 'Price changed',
    currency: 'Currency changed',
    quantity: 'Quantity adjusted'
  },
  vi: {
    updated: (count: number, attention: number) =>
      `Giỏ hàng đã được cập nhật. ${count} sản phẩm thay đổi; ${attention} sản phẩm cần bạn kiểm tra.`,
    unavailable: 'Không khả dụng',
    removed: 'Đã bị xóa khỏi ưu đãi hiện tại',
    repriced: 'Giá đã thay đổi',
    currency: 'Đơn vị tiền tệ đã thay đổi',
    quantity: 'Số lượng đã điều chỉnh'
  }
} as const;

export function CartChangeSummary({
  locale,
  changes,
  previousQuote,
  quote,
  compact = false
}: {
  locale: Locale;
  changes: CartMarketGroupedChanges;
  previousQuote: CartQuote | null;
  quote: CartQuote | null;
  compact?: boolean;
}) {
  const groups = [
    {key: 'unavailable', label: copy[locale].unavailable, facts: changes.unavailable},
    {key: 'removed', label: copy[locale].removed, facts: changes.removed},
    {key: 'repriced', label: copy[locale].repriced, facts: changes.repriced},
    {
      key: 'currencyChanged',
      label: copy[locale].currency,
      facts: changes.currencyChanged
    },
    {
      key: 'quantityAdjusted',
      label: copy[locale].quantity,
      facts: changes.quantityAdjusted
    }
  ].filter((group) => group.facts.length > 0);

  if (groups.length === 0) return null;

  const changedLineIds = new Set(
    groups.flatMap((group) => group.facts.map((fact) => fact.lineId))
  );
  const attentionLineIds = new Set(
    [...changes.unavailable, ...changes.removed].map((fact) => fact.lineId)
  );
  const announcement = copy[locale].updated(
    changedLineIds.size,
    attentionLineIds.size
  );

  return (
    <Alert
      variant={attentionLineIds.size > 0 ? 'warning' : 'success'}
      className={compact ? 'grid gap-2 px-3 py-3 text-sm' : 'grid gap-3 px-4 py-4'}
      aria-live="polite"
      aria-atomic="true"
    >
      <p className="font-semibold">{announcement}</p>
      <div className="grid gap-2">
        {groups.map((group) => (
          <div key={group.key} className="grid gap-1">
            <p className="text-sm font-semibold">{group.label}</p>
            <ul className="grid gap-1 text-sm">
              {group.facts.map((fact) => (
                <li key={`${group.key}-${fact.lineId}`} className="min-w-0 break-words">
                  {formatFact(group.key, fact, previousQuote, quote)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </Alert>
  );
}

function formatFact(
  group: string,
  fact: CartMarketChangeFact,
  previousQuote: CartQuote | null,
  quote: CartQuote | null
) {
  if (group === 'currencyChanged') {
    return `${fact.title}: ${fact.previous ?? ''} → ${fact.current ?? ''}`;
  }
  if (group === 'quantityAdjusted') {
    return `${fact.title}: ${fact.previous ?? ''} → ${fact.current ?? ''}`;
  }
  if (group === 'repriced') {
    const previousLine = previousQuote?.lines.find((line) => line.lineId === fact.lineId);
    const currentLine = quote?.lines.find((line) => line.lineId === fact.lineId);
    if (
      previousLine &&
      currentLine &&
      previousLine.currencyCode === currentLine.currencyCode &&
      typeof fact.previous === 'number' &&
      typeof fact.current === 'number'
    ) {
      return `${fact.title}: ${formatMoney({
        amountMinor: fact.previous,
        currencyCode: currentLine.currencyCode
      })} → ${formatMoney({
        amountMinor: fact.current,
        currencyCode: currentLine.currencyCode
      })}`;
    }
  }
  return fact.title;
}
