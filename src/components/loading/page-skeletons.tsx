import type { ReactNode } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

function LoadingRegion({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true" className={cn(className)}>
      <span className="sr-only">Đang tải nội dung. Loading content.</span>
      {children}
    </div>
  );
}

function HeadingSkeleton() {
  return (
    <div className="grid max-w-2xl gap-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-9 w-3/5 max-w-md" />
      <Skeleton className="h-4 w-full max-w-xl" />
      <Skeleton className="h-4 w-4/5 max-w-lg" />
    </div>
  );
}

function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="grid gap-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <Skeleton className="aspect-[4/3] w-full rounded-[14px]" />
          <div className="grid gap-2">
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StorefrontPageSkeleton() {
  return (
    <LoadingRegion className="container grid gap-8 py-8 lg:py-12">
      <HeadingSkeleton />
      <CardGridSkeleton />
    </LoadingRegion>
  );
}

export function CatalogPageSkeleton() {
  return (
    <LoadingRegion className="container grid gap-6 py-6">
      <HeadingSkeleton />
      <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="hidden gap-5 border-r border-[var(--border)] pr-5 lg:grid">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="grid gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-5/6" />
            </div>
          ))}
        </aside>
        <div className="grid gap-5">
          <div className="grid grid-cols-[minmax(0,1fr)_108px] gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
          <CardGridSkeleton />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function ProductPageSkeleton() {
  return (
    <LoadingRegion className="container grid gap-8 py-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)] lg:gap-12 lg:py-12">
      <Skeleton className="aspect-square w-full rounded-[18px]" />
      <div className="grid content-start gap-5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-10 w-4/5" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="grid gap-3 border-t border-[var(--border)] pt-5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function CheckoutPageSkeleton() {
  return (
    <LoadingRegion className="container grid gap-6 pb-28 pt-6 lg:pb-10 lg:pt-8">
      <HeadingSkeleton />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px] lg:items-start">
        <div className="grid gap-4">
          {Array.from({ length: 2 }, (_, index) => (
            <div
              key={index}
              className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5"
            >
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
            </div>
          ))}
        </div>
        <div className="grid gap-4 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-5">
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </LoadingRegion>
  );
}

export function AccountPageSkeleton() {
  return (
    <LoadingRegion className="grid gap-6">
      <HeadingSkeleton />
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4"
        >
          <Skeleton className="h-5 w-2/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      ))}
    </LoadingRegion>
  );
}

export function OrderPageSkeleton() {
  return (
    <LoadingRegion className="container grid gap-6 py-8">
      <HeadingSkeleton />
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div
            key={index}
            className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-3/5" />
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>
      <Skeleton className="h-56 w-full rounded-[var(--radius-card)]" />
    </LoadingRegion>
  );
}

export function AdminPageSkeleton() {
  return (
    <LoadingRegion className="grid gap-5 px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
      <div className="flex items-center justify-between gap-4">
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-56 max-w-full" />
        </div>
        <Skeleton className="h-10 w-28" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-28 w-full rounded-[var(--radius-card)]" />
        ))}
      </div>
      <div className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4">
        <Skeleton className="h-10 w-full" />
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-14 w-full" />
        ))}
      </div>
    </LoadingRegion>
  );
}
