'use client';

import {useEffect, useState} from 'react';
import type {Locale} from '@/i18n/routing';
import {ReviewForm} from './review-form';

type ReviewFormLabels = {
  title: string;
  rating: string;
  reviewTitle: string;
  body: string;
  submit: string;
  pending: string;
  notEligible: string;
  error: string;
};

export function ReviewFormGate({
  productId,
  locale,
  returnTo,
  labels
}: {
  productId: string;
  locale: Locale;
  returnTo: string;
  labels: ReviewFormLabels;
}) {
  const [eligible, setEligible] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/reviews/eligibility?productId=${encodeURIComponent(productId)}`, {
      cache: 'no-store',
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as {status?: unknown};
      })
      .then((result) => setEligible(result?.status === 'eligible'))
      .catch(() => undefined);

    return () => controller.abort();
  }, [productId]);

  return eligible ? (
    <ReviewForm productId={productId} locale={locale} returnTo={returnTo} labels={labels} />
  ) : null;
}
