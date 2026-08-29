'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  Package,
  ReceiptText,
  Search,
  Sparkles,
  Truck,
  X
} from 'lucide-react';
import { AccountEmptyState } from '@/components/account/account-empty-state';
import { formatAdminMoney, statusLabel } from '@/components/admin/orders/format';
import { resolvePublicProductImageUrl } from '@/catalog/product-image-url';
import { getCatalogPath, getOrderPath, type Locale } from '@/i18n/routing';
import type { CustomerOrderHistoryItem } from '@/fulfillment/account-queries';

export type Labels = {
  title: string;
  empty: string;
  total: string;
  payment: string;
  digital: string;
  physical: string;
  open: string;
  tabAll?: string;
  tabAwaitingPayment?: string;
  tabInProgress?: string;
  tabCompleted?: string;
  searchPlaceholder?: string;
  noFilteredOrders?: string;
  clearFilters?: string;
  payNow?: string;
  viewDetails?: string;
  moreItems?: string;
  placedAt?: string;
  digitalReady?: string;
  digitalPending?: string;
  physicalShipping?: string;
  physicalDelivered?: string;
  physicalPending?: string;
};

const copy = {
  en: {
    emptyTitle: 'No orders yet',
    emptyBody:
      'When you buy a handmade item or PDF pattern, the order and fulfillment status will appear here.',
    shop: 'Visit the shop',
    summary: 'Order timeline',
    updated: 'Updated',
    latest: 'Latest activity',
    tabAll: 'All',
    tabAwaitingPayment: 'Awaiting payment',
    tabInProgress: 'In progress',
    tabCompleted: 'Completed',
    searchPlaceholder: 'Search by order # or product…',
    noFilteredOrders: 'No orders match your search or filter.',
    clearFilters: 'Clear filters',
    payNow: 'Pay now',
    viewDetails: 'View details',
    moreItems: '+ {count} more items',
    placedAt: 'Placed on {date}',
    digitalReady: 'PDF pattern ready',
    digitalPending: 'PDF pattern (pending payment)',
    physicalShipping: 'Shipping in progress',
    physicalDelivered: 'Delivered',
    physicalPending: 'Handmade item'
  },
  vi: {
    emptyTitle: 'Bạn chưa có đơn hàng nào',
    emptyBody: 'Khi bạn mua đồ handmade hoặc mẫu PDF, trạng thái đơn và xử lý sẽ hiện ở đây.',
    shop: 'Ghé cửa hàng',
    summary: 'Dòng thời gian đơn',
    updated: 'Cập nhật',
    latest: 'Hoạt động gần nhất',
    tabAll: 'Tất cả',
    tabAwaitingPayment: 'Chờ thanh toán',
    tabInProgress: 'Đang xử lý',
    tabCompleted: 'Đã hoàn tất',
    searchPlaceholder: 'Tìm theo mã đơn hoặc sản phẩm…',
    noFilteredOrders: 'Không tìm thấy đơn hàng nào khớp với tìm kiếm hoặc bộ lọc.',
    clearFilters: 'Xóa bộ lọc',
    payNow: 'Thanh toán ngay',
    viewDetails: 'Xem chi tiết',
    moreItems: '+ {count} sản phẩm khác',
    placedAt: 'Đặt ngày {date}',
    digitalReady: 'Mẫu PDF sẵn sàng tải',
    digitalPending: 'Mẫu PDF (chờ thanh toán)',
    physicalShipping: 'Đang giao hàng',
    physicalDelivered: 'Đã giao thành công',
    physicalPending: 'Đồ handmade'
  }
} as const;

type FilterTab = 'all' | 'awaiting_payment' | 'in_progress' | 'completed';

function statusTone(status: string) {
  const normalized = status.toLowerCase();
  return (
    normalized.includes('paid') ||
    normalized.includes('delivered') ||
    normalized.includes('complete')
      ? 'success'
      : normalized.includes('failed') ||
          normalized.includes('cancel') ||
          normalized.includes('reject')
        ? 'danger'
        : normalized.includes('verifying') ||
            normalized.includes('packing') ||
            normalized.includes('shipped')
          ? 'warning'
          : 'neutral'
  );
}

function statusBadge(status: string) {
  const tone = statusTone(status);
  const className =
    tone === 'success'
      ? 'border-[var(--success)]/40 bg-[var(--success-surface)] text-[var(--success)] shadow-xs'
      : tone === 'danger'
        ? 'border-[var(--destructive)]/40 bg-[var(--destructive-surface)] text-[var(--destructive)] shadow-xs'
        : tone === 'warning'
          ? 'border-[var(--warning)]/40 bg-[var(--warning-surface)] text-[var(--warning)] shadow-xs'
          : 'border-[var(--border)] bg-[var(--surface-muted)] text-[var(--muted-foreground)]';

  return `inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${className}`;
}

function formatCustomerDate(value: string | null, locale: Locale) {
  if (!value) {
    return locale === 'vi' ? 'Chưa cập nhật' : 'Not updated yet';
  }
  return new Intl.DateTimeFormat(locale === 'vi' ? 'vi-VN' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(value));
}

function isOrderInProgress(order: CustomerOrderHistoryItem) {
  const payment = order.customerPaymentStatus.toLowerCase();
  const physical = order.physicalFulfillmentStatus.toLowerCase();
  return (
    payment === 'verifying_payment' ||
    payment === 'verifying' ||
    physical === 'packing' ||
    physical === 'shipped'
  );
}

function isOrderCompleted(order: CustomerOrderHistoryItem) {
  const payment = order.customerPaymentStatus.toLowerCase();
  const physical = order.physicalFulfillmentStatus.toLowerCase();
  return (
    payment === 'paid' &&
    (physical === 'delivered' ||
      physical === 'not_required' ||
      physical === 'blocked' ||
      order.digitalFulfillmentStatus === 'eligible')
  );
}

export function AccountOrderHistory({
  orders,
  locale,
  labels
}: {
  orders: CustomerOrderHistoryItem[];
  locale: Locale;
  labels: Labels;
}) {
  const t = copy[locale];
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const counts = useMemo(() => {
    return {
      all: orders.length,
      awaiting_payment: orders.filter((o) => o.customerPaymentStatus === 'awaiting_payment').length,
      in_progress: orders.filter(isOrderInProgress).length,
      completed: orders.filter(isOrderCompleted).length
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === 'awaiting_payment' && order.customerPaymentStatus !== 'awaiting_payment') {
        return false;
      }
      if (activeTab === 'in_progress' && !isOrderInProgress(order)) {
        return false;
      }
      if (activeTab === 'completed' && !isOrderCompleted(order)) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.trim().toLowerCase();
        const matchNumber = order.orderNumber.toLowerCase().includes(query);
        const matchItems =
          order.items?.some(
            (item) =>
              item.title.toLowerCase().includes(query) ||
              (item.variantLabel && item.variantLabel.toLowerCase().includes(query))
          ) ?? false;
        return matchNumber || matchItems;
      }

      return true;
    });
  }, [orders, activeTab, searchQuery]);

  const latestOrder = orders[0] ?? null;

  return (
    <section className="grid gap-6">
      {/* Header */}
      <header className="grid gap-4 border-b border-[var(--border)] pb-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="grid gap-2">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-[var(--accent)]">
            <Sparkles className="size-3.5" aria-hidden="true" />
            {t.summary}
          </p>
          <h1 className="text-[28px] font-bold tracking-tight text-[var(--foreground)] sm:text-[34px]">
            {labels.title}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--muted-foreground)] sm:justify-end">
          <span className="inline-flex min-h-9 items-center rounded-full bg-[var(--surface-muted)] px-3.5 font-semibold text-[var(--foreground)] ring-1 ring-[var(--border)]/60">
            {orders.length} {locale === 'vi' ? 'đơn' : orders.length === 1 ? 'order' : 'orders'}
          </span>
          {latestOrder ? (
            <span className="inline-flex min-h-9 items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 text-xs font-medium">
              <Clock3 className="size-3.5 text-[var(--muted-foreground)]" aria-hidden="true" />
              {t.latest}: {formatCustomerDate(latestOrder.updatedAt, locale)}
            </span>
          ) : null}
        </div>
      </header>

      {orders.length === 0 ? (
        <AccountEmptyState
          icon={<Package className="size-6" aria-hidden="true" />}
          title={t.emptyTitle}
          body={labels.empty || t.emptyBody}
          cta={{ href: getCatalogPath(locale), label: t.shop }}
        />
      ) : (
        <div className="grid gap-5">
          {/* Controls: Search and Filter Tabs */}
          <div className="grid gap-3 sm:flex sm:items-center sm:justify-between">
            {/* Filter Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-1 ring-1 ring-[var(--border)]/60">
              {(
                [
                  { key: 'all', label: labels.tabAll || t.tabAll, count: counts.all },
                  {
                    key: 'awaiting_payment',
                    label: labels.tabAwaitingPayment || t.tabAwaitingPayment,
                    count: counts.awaiting_payment
                  },
                  {
                    key: 'in_progress',
                    label: labels.tabInProgress || t.tabInProgress,
                    count: counts.in_progress
                  },
                  {
                    key: 'completed',
                    label: labels.tabCompleted || t.tabCompleted,
                    count: counts.completed
                  }
                ] as const
              ).map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`inline-flex items-center gap-1.5 rounded-[calc(var(--radius-control)-2px)] px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-[var(--surface)] text-[var(--foreground)] shadow-xs ring-1 ring-[var(--border)]/80'
                        : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count > 0 ? (
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                          isActive
                            ? 'bg-[var(--accent)]/15 text-[var(--accent)]'
                            : 'bg-[var(--surface-paper)] text-[var(--muted-foreground)]'
                        }`}
                      >
                        {tab.count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[220px] sm:w-[260px]">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={labels.searchPlaceholder || t.searchPlaceholder}
                className="h-10 w-full rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] pl-9 pr-8 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          {/* Filter Empty State */}
          {filteredOrders.length === 0 ? (
            <div className="grid place-items-center rounded-[var(--radius-card)] border border-dashed border-[var(--border)] bg-[var(--surface-muted)]/30 p-10 text-center">
              <Package className="size-8 text-[var(--muted-foreground)]/60" aria-hidden="true" />
              <p className="mt-3 text-sm font-semibold text-[var(--foreground)]">
                {labels.noFilteredOrders || t.noFilteredOrders}
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('all');
                  setSearchQuery('');
                }}
                className="mt-4 inline-flex items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-1.5 text-xs font-semibold text-[var(--accent)] hover:bg-[var(--surface-muted)]"
              >
                {labels.clearFilters || t.clearFilters}
              </button>
            </div>
          ) : (
            /* Orders List */
            <div className="grid gap-4">
              {filteredOrders.map((order) => {
                const isAwaiting = order.customerPaymentStatus === 'awaiting_payment';
                const isPaid = order.customerPaymentStatus === 'paid';
                const primaryItem = order.items?.[0] ?? null;
                const extraItemsCount = (order.items?.length ?? 0) - 1;
                const displayDate = order.createdAt ?? order.updatedAt;

                return (
                  <article
                    key={order.orderId}
                    className="group relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--accent)]/60 hover:shadow-[0_18px_45px_rgba(91,55,35,0.08)]"
                  >
                    {/* Top bar: Order ID, Date & Payment Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)]/60 bg-[var(--surface-muted)]/40 px-4 py-3 sm:px-5">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <span className="flex size-7 items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface)] text-[var(--accent)] ring-1 ring-[var(--border)]/70">
                          <ReceiptText className="size-3.5" aria-hidden="true" />
                        </span>
                        <strong className="text-sm font-semibold text-[var(--foreground)]">
                          #{order.orderNumber}
                        </strong>
                        {displayDate ? (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            · {formatCustomerDate(displayDate, locale)}
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={statusBadge(order.customerPaymentStatus)}>
                          {statusLabel(order.customerPaymentStatus)}
                        </span>
                      </div>
                    </div>

                    {/* Middle content: Thumbnails & Products Summary */}
                    <div className="grid gap-4 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:p-5">
                      {/* Product Thumbnails Strip */}
                      <div className="flex items-center gap-2">
                        {order.items && order.items.length > 0 ? (
                          order.items.slice(0, 3).map((item, idx) => {
                            const imgUrl = resolvePublicProductImageUrl(item.imageUrl);
                            const Icon = item.fulfillmentType === 'digital' ? FileText : Package;
                            return (
                              <div
                                key={item.lineId || idx}
                                className="relative size-14 shrink-0 overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface-muted)] ring-1 ring-[var(--border)]/80 sm:size-16"
                              >
                                {imgUrl ? (
                                  <Image
                                    src={imgUrl}
                                    alt={item.title}
                                    fill
                                    sizes="64px"
                                    className="object-cover transition-transform group-hover:scale-105"
                                  />
                                ) : (
                                  <span className="grid size-full place-items-center text-[var(--accent)]">
                                    <Icon className="size-6 opacity-80" strokeWidth={1.6} />
                                  </span>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="grid size-14 shrink-0 place-items-center rounded-[var(--radius-control)] bg-[var(--surface-muted)] text-[var(--accent)] ring-1 ring-[var(--border)]/80 sm:size-16">
                            <Package className="size-6" strokeWidth={1.6} />
                          </div>
                        )}
                      </div>

                      {/* Main Product Title & Status Badges */}
                      <div className="min-w-0 grid gap-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold text-[var(--foreground)]">
                            {primaryItem ? primaryItem.title : `Order #${order.orderNumber}`}
                          </p>
                          {extraItemsCount > 0 ? (
                            <span className="inline-flex items-center rounded-full bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold text-[var(--muted-foreground)] ring-1 ring-[var(--border)]/60">
                              {(labels.moreItems || t.moreItems).replace(
                                '{count}',
                                String(extraItemsCount)
                              )}
                            </span>
                          ) : null}
                        </div>

                        {primaryItem?.variantLabel ? (
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {primaryItem.variantLabel}
                          </p>
                        ) : null}

                        {/* Fulfillment Pills */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          {order.digitalFulfillmentStatus === 'eligible' || isPaid ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--success)]">
                              <CheckCircle2 className="size-3" aria-hidden="true" />
                              {labels.digitalReady || t.digitalReady}
                            </span>
                          ) : order.digitalFulfillmentStatus === 'blocked' && isAwaiting ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                              <FileText className="size-3" aria-hidden="true" />
                              {labels.digitalPending || t.digitalPending}
                            </span>
                          ) : null}

                          {order.physicalFulfillmentStatus === 'shipped' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--warning-surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--warning)]">
                              <Truck className="size-3" aria-hidden="true" />
                              {labels.physicalShipping || t.physicalShipping}
                            </span>
                          ) : order.physicalFulfillmentStatus === 'delivered' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--success-surface)] px-2.5 py-0.5 text-xs font-medium text-[var(--success)]">
                              <CheckCircle2 className="size-3" aria-hidden="true" />
                              {labels.physicalDelivered || t.physicalDelivered}
                            </span>
                          ) : order.physicalFulfillmentStatus === 'awaiting_fulfillment' ||
                            order.physicalFulfillmentStatus === 'packing' ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--muted-foreground)]">
                              <Package className="size-3" aria-hidden="true" />
                              {statusLabel(order.physicalFulfillmentStatus)}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      {/* Right side: Total Price & CTA Button */}
                      <div className="flex items-center justify-between gap-4 border-t border-[var(--border)]/60 pt-3 sm:border-t-0 sm:pt-0 sm:flex-col sm:items-end">
                        <div className="grid gap-0.5 sm:text-right">
                          <span className="text-xs font-medium text-[var(--muted-foreground)]">
                            {labels.total}
                          </span>
                          <strong className="text-lg font-bold tabular-nums text-[var(--foreground)]">
                            {formatAdminMoney(order.amountMinor, order.currencyCode)}
                          </strong>
                        </div>

                        <Link
                          href={getOrderPath(locale, order.orderNumber)}
                          className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-[var(--radius-control)] px-4 py-2 text-sm font-semibold transition-all ${
                            isAwaiting
                              ? 'bg-[var(--accent)] !text-white shadow-sm hover:bg-[var(--accent-hover)] hover:shadow-md'
                              : 'border border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--surface-muted)]'
                          }`}
                        >
                          {isAwaiting ? (
                            <>
                              <CreditCard className="size-4 text-white" aria-hidden="true" />
                              <span className="!text-white">{labels.payNow || t.payNow}</span>
                            </>
                          ) : (
                            <>
                              <span>{labels.viewDetails || t.viewDetails}</span>
                              <ArrowRight
                                className="size-4 transition-transform group-hover:translate-x-1"
                                aria-hidden="true"
                              />
                            </>
                          )}
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
