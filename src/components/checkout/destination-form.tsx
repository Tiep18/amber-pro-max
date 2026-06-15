'use client';

import {useState, useTransition} from 'react';
import {refreshCheckoutQuoteAction} from '@/checkout/actions';
import type {MaterialQuoteChange} from '@/checkout/market-revalidation';
import type {CartQuote} from '@/checkout/types';
import type {Locale} from '@/i18n/routing';
import {Alert} from '@/components/ui/alert';
import {Button} from '@/components/ui/button';
import {QuoteDiffDialog} from './quote-diff-dialog';

const copy = {
  en: {
    country: 'Shipping country',
    submit: 'Update destination',
    pending: 'Calculating',
    invalid: 'Enter a two-letter country code.',
    error: 'Destination could not be calculated.'
  },
  vi: {
    country: 'Quoc gia giao hang',
    submit: 'Cap nhat dia diem',
    pending: 'Dang tinh',
    invalid: 'Nhap ma quoc gia gom hai chu cai.',
    error: 'Khong the tinh dia diem giao hang.'
  }
} as const;

export function DestinationForm({
  locale,
  acceptedQuote,
  onAcceptedQuote
}: {
  locale: Locale;
  acceptedQuote: CartQuote | null;
  onAcceptedQuote: (quote: CartQuote) => void;
}) {
  const t = copy[locale];
  const [countryCode, setCountryCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [proposal, setProposal] = useState<{quote: CartQuote; changes: MaterialQuoteChange[]} | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await refreshCheckoutQuoteAction({
        locale,
        market: acceptedQuote?.market ?? (locale === 'vi' ? 'vn' : 'intl'),
        lines: acceptedQuote?.lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.requestedQuantity,
          marketAtAdd: line.marketAtAdd,
          addedAt: acceptedQuote.quotedAt,
          updatedAt: acceptedQuote.quotedAt
        })) ?? [],
        destinationCountryCode: countryCode,
        acceptedQuote
      });
      if (result.status === 'invalid') {
        setError(t.invalid);
        return;
      }
      if (result.status === 'error') {
        setError(t.error);
        return;
      }
      if (result.materialChanges.length > 0) {
        setProposal({quote: result.quote, changes: result.materialChanges});
        return;
      }
      onAcceptedQuote(result.quote);
    });
  }

  return (
    <div className="grid gap-3">
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      <label className="space-y-2">
        <span className="font-semibold">{t.country}</span>
        <input
          value={countryCode}
          maxLength={2}
          onChange={(event) => setCountryCode(event.target.value.toUpperCase())}
          className="min-h-11 w-full rounded-[var(--radius-control)] border border-[var(--border)] px-3 uppercase"
        />
      </label>
      <Button disabled={pending || countryCode.trim().length !== 2} onClick={submit}>
        {pending ? t.pending : t.submit}
      </Button>
      {proposal ? (
        <QuoteDiffDialog
          locale={locale}
          proposal={proposal.quote}
          changes={proposal.changes}
          onCancel={() => setProposal(null)}
          onConfirm={() => {
            onAcceptedQuote(proposal.quote);
            setProposal(null);
          }}
        />
      ) : null}
    </div>
  );
}
