'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Locale } from '@/i18n/routing';
import { ReviewForm } from './review-form';

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
  const [status, setStatus] = useState<'loading' | 'eligible' | 'ineligible' | 'error'>('loading');
  const [retryVersion, setRetryVersion] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    void fetch(`/api/reviews/eligibility?productId=${encodeURIComponent(productId)}`, {
      cache: 'no-store',
      signal: controller.signal
    })
      .then(async (response) => {
        if (!response.ok) throw new Error('review_eligibility_failed');
        return (await response.json()) as { status?: unknown };
      })
      .then((result) => setStatus(result?.status === 'eligible' ? 'eligible' : 'ineligible'))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setStatus('error');
        }
      });

    return () => controller.abort();
  }, [productId, retryVersion]);

  if (status === 'eligible') {
    return <ReviewForm productId={productId} locale={locale} returnTo={returnTo} labels={labels} />;
  }

  if (status === 'loading') {
    return (
      <div role="status" aria-live="polite" aria-busy="true" className="grid gap-3">
        <span className="sr-only">
          {locale === 'vi' ? 'Đang kiểm tra quyền đánh giá.' : 'Checking review eligibility.'}
        </span>
        <Skeleton className="h-6 w-44" />
        <Skeleton className="h-24 w-full rounded-[var(--radius-control)]" />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center gap-3 text-sm text-[var(--destructive)]"
      >
        <p>{labels.error}</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setStatus('loading');
            setRetryVersion((version) => version + 1);
          }}
        >
          {locale === 'vi' ? 'Thử lại' : 'Retry'}
        </Button>
      </div>
    );
  }

  return <p className="text-sm text-[var(--muted-foreground)]">{labels.notEligible}</p>;
}
