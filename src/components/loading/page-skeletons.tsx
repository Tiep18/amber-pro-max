import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function LoadingRegion({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">Đang tải nội dung. Loading content.</span>
      <div aria-hidden="true" className={cn(className)}>
        {children}
      </div>
    </div>
  );
}

function PageHeadingSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cn('grid max-w-[72ch]', compact ? 'gap-1.5' : 'gap-3')}>
      <Skeleton className="h-3 w-24" />
      <Skeleton className={cn('w-3/5 max-w-md', compact ? 'h-8' : 'h-10')} />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-4 w-4/5 max-w-lg" />
    </div>
  );
}

function SummaryRows({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
      ))}
    </div>
  );
}

export function ProductCardSkeleton() {
  return (
    <article className="grid h-full grid-rows-[auto_1fr] overflow-hidden rounded-[18px] bg-[var(--surface)] shadow-[0_18px_55px_rgb(73_52_32/8%)] ring-1 ring-[var(--border)]/70">
      <Skeleton className="aspect-[5/4] w-full rounded-none" />
      <div className="grid h-full grid-rows-[1fr_auto] gap-2.5 p-3 sm:gap-4 sm:p-5">
        <div className="grid content-start gap-1.5 sm:gap-2">
          <div className="flex items-start justify-between gap-2">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-3 w-14" />
          </div>
          <Skeleton className="h-5 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[var(--border)]/70 pt-2.5 sm:gap-4 sm:pt-4">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-5 w-5" />
        </div>
      </div>
    </article>
  );
}

function ProductGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-y-6 min-[480px]:grid-cols-2 min-[480px]:gap-x-3 sm:gap-5 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function StorefrontPageSkeleton() {
  return (
    <LoadingRegion className="overflow-hidden bg-[var(--background)]">
      <section className="relative isolate overflow-hidden">
        <div className="container relative grid min-h-[620px] items-center gap-10 pb-14 pt-20 sm:pt-24 lg:min-h-[540px] lg:grid-cols-[0.86fr_1.14fr] lg:gap-10 lg:pb-12 lg:pt-14">
          <div className="grid max-w-2xl gap-5">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-12 w-4/5 sm:h-16 lg:h-20" />
            <Skeleton className="h-9 w-full max-w-xl sm:h-11" />
            <div className="grid gap-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <div className="flex flex-col items-stretch gap-3 pt-2 min-[420px]:flex-row min-[420px]:items-center">
              <Skeleton className="h-12 min-[420px]:w-44" />
              <Skeleton className="h-12 min-[420px]:w-40" />
            </div>
          </div>
          <div className="relative min-h-[430px] lg:min-h-[500px]">
            <div className="relative ml-auto grid max-w-[760px] gap-4 rounded-[28px] p-2 sm:p-3 lg:grid-cols-[1.14fr_0.86fr] lg:grid-rows-2 lg:items-stretch">
              <Skeleton className="aspect-[5/4] w-full rounded-[24px] lg:row-span-2 lg:h-full lg:min-h-[430px] lg:aspect-auto" />
              <div className="grid gap-4 sm:grid-cols-[0.92fr_1.08fr] lg:contents">
                <Skeleton className="aspect-[4/3] w-full rounded-[18px] lg:aspect-auto lg:h-full" />
                <Skeleton className="aspect-[4/3] w-full rounded-[18px] sm:-mt-10 lg:mt-0 lg:aspect-auto lg:h-full" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </LoadingRegion>
  );
}

export function CatalogPageSkeleton() {
  return (
    <LoadingRegion className="container grid gap-4 py-5 sm:py-6 lg:gap-5">
      <div className="hidden h-5 w-40 sm:block">
        <Skeleton className="h-4 w-full" />
      </div>
      <PageHeadingSkeleton compact />
      <div className="grid gap-4">
        <div className="flex gap-1 overflow-hidden border-b border-[var(--border)] pb-1">
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-10 w-28 shrink-0" />
          ))}
        </div>
        <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="hidden content-start gap-5 border-r border-[var(--border)] pr-5 lg:grid">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="grid gap-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-5/6" />
              </div>
            ))}
          </aside>
          <div className="min-w-0 grid gap-4">
            <div className="grid grid-cols-[minmax(0,1fr)_108px] gap-2 sm:grid-cols-[minmax(0,1fr)_220px] lg:hidden">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
            <Skeleton className="h-4 w-32" />
            <ProductGridSkeleton />
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

export function ProductPageSkeleton() {
  return (
    <LoadingRegion className="container grid gap-7 py-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)] lg:gap-12 lg:py-12">
      <div className="grid gap-3 lg:sticky lg:top-24 lg:self-start">
        <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)]">
          <Skeleton className="aspect-square w-full rounded-none" />
        </div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5 xl:grid-cols-6">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton
              key={index}
              className="aspect-square w-full rounded-[var(--radius-control)]"
            />
          ))}
        </div>
      </div>
      <section className="grid content-start gap-5 lg:pt-1">
        <Skeleton className="h-3 w-48" />
        <div className="flex items-start justify-between gap-4">
          <div className="grid flex-1 gap-3">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-11 w-4/5" />
            <Skeleton className="h-11 w-3/5" />
          </div>
          <Skeleton className="h-11 w-11 shrink-0" />
        </div>
        <div className="grid gap-3">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="grid min-h-56 gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-5">
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
        <div className="grid gap-3 border-t border-[var(--border)] pt-5">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 shrink-0" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </section>
    </LoadingRegion>
  );
}

export function CheckoutPageSkeleton() {
  return (
    <LoadingRegion className="container grid gap-5 pb-28 pt-6 lg:gap-6 lg:pb-10 lg:pt-8">
      <header className="grid max-w-[72ch] gap-1.5">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </header>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start lg:gap-7">
        <section className="grid content-start gap-4">
          <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface-paper)]">
            <div className="grid gap-3 px-5 py-5 sm:px-6">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-11 w-full" />
            </div>
            <div className="border-t border-[var(--border)]" />
            <div className="grid gap-4 px-5 py-5 sm:px-6">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-11 w-full" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Skeleton className="h-11 w-full" />
                <Skeleton className="h-11 w-full" />
              </div>
            </div>
          </div>
        </section>
        <aside className="grid content-start gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5 lg:sticky lg:top-24">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-20 w-full" />
          <SummaryRows />
          <Skeleton className="h-12 w-full" />
        </aside>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-[var(--surface-paper)] px-3 py-3 lg:hidden">
        <div className="mx-auto grid max-w-2xl grid-cols-[minmax(0,1fr)_minmax(164px,auto)] items-center gap-3">
          <div className="grid gap-1">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-6 w-28" />
          </div>
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function AccountPageSkeleton() {
  return (
    <LoadingRegion className="grid gap-8">
      <section className="grid gap-6 border-b border-[var(--border)] pb-7 lg:grid-cols-[minmax(0,1fr)_minmax(280px,0.42fr)] lg:items-end">
        <PageHeadingSkeleton />
        <div className="grid gap-3 text-sm">
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="grid grid-cols-[32px_1fr] gap-3 rounded-[var(--radius-card)] bg-[var(--surface-muted)] p-4"
            >
              <Skeleton className="h-8 w-8" />
              <div className="grid gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </section>
      <section className="grid gap-3">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="grid grid-cols-[36px_1fr_auto] items-center gap-4 border-b border-[var(--border)] py-4"
          >
            <Skeleton className="h-9 w-9" />
            <div className="grid gap-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-4/5" />
            </div>
            <Skeleton className="h-4 w-4" />
          </div>
        ))}
      </section>
    </LoadingRegion>
  );
}

export function OrderPageSkeleton() {
  return (
    <LoadingRegion className="container grid gap-8 py-10 lg:grid-cols-[minmax(0,1fr)_380px]">
      <section className="grid content-start gap-5">
        <div className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-5">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-9 w-3/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </div>
        <div className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-5">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </section>
      <aside className="grid content-start gap-5 lg:sticky lg:top-24">
        <div className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-5">
          <Skeleton className="h-6 w-32" />
          <SummaryRows />
        </div>
        <Skeleton className="h-28 w-full rounded-[var(--radius-card)]" />
      </aside>
    </LoadingRegion>
  );
}

export function AdminPageSkeleton() {
  return (
    <LoadingRegion className="grid w-full gap-4 px-4 py-4 sm:px-6 lg:px-8">
      <header className="grid min-h-12 grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-[var(--border)] pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="hidden h-3 w-16 xl:block" />
          <Skeleton className="h-7 w-48" />
          <Skeleton className="hidden h-4 w-64 md:block" />
        </div>
        <Skeleton className="h-10 w-28" />
      </header>
      <section className="grid gap-4 md:grid-cols-3">
        <div className="grid min-h-64 gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-5 md:col-span-2">
          <Skeleton className="h-6 w-36" />
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton key={index} className="h-16 w-full" />
          ))}
        </div>
        <div className="grid content-start gap-4 rounded-[var(--radius-card)] border border-[var(--border)] p-5">
          <Skeleton className="h-6 w-28" />
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12 w-full" />
          ))}
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] p-4"
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-16" />
          </div>
        ))}
      </section>
    </LoadingRegion>
  );
}
