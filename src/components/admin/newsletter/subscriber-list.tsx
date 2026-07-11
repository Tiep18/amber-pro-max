import { CircleCheck, Mail, ShieldCheck, Users } from 'lucide-react';
import { AdminEmptyState, AdminStatusPill } from '@/components/admin/admin-page';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import type { AdminNewsletterFilters, AdminNewsletterSubscriber } from '@/newsletter/admin-queries';
import { cn } from '@/lib/utils';

type SubscriberListProps = {
  subscribers: AdminNewsletterSubscriber[];
  filters: Required<AdminNewsletterFilters>;
};

function formatDate(value: string | null) {
  if (!value) return 'None';
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(new Date(value));
}

function hasEvidence(subscriber: AdminNewsletterSubscriber) {
  return Boolean(
    subscriber.latestConsent?.hasIpEvidence || subscriber.latestConsent?.hasUserAgentEvidence
  );
}

function ConsentDetails({ subscriber }: { subscriber: AdminNewsletterSubscriber }) {
  return subscriber.latestConsent ? (
    <>
      <p className="font-medium">
        {subscriber.latestConsent.eventType} · {subscriber.latestConsent.source}
      </p>
      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
        {formatDate(subscriber.latestConsent.occurredAt)} ·{' '}
        {hasEvidence(subscriber) ? 'Evidence stored' : 'No evidence'}
      </p>
    </>
  ) : (
    <span className="text-[var(--muted-foreground)]">No consent event</span>
  );
}

export function SubscriberList({ subscribers, filters }: SubscriberListProps) {
  const metrics = [
    { label: 'Visible', value: subscribers.length, description: 'matching filters', icon: Users },
    {
      label: 'Subscribed',
      value: subscribers.filter((subscriber) => subscriber.status === 'subscribed').length,
      description: 'currently active',
      icon: CircleCheck
    },
    {
      label: 'Evidence stored',
      value: subscribers.filter(hasEvidence).length,
      description: 'minimized consent proof',
      icon: ShieldCheck
    }
  ];

  return (
    <section className="grid gap-4">
      <section className="grid overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_8px_24px_rgba(92,48,26,0.05)] sm:grid-cols-3">
        {metrics.map((metric, index) => {
          const Icon = metric.icon;
          return (
            <div
              key={metric.label}
              className={cn(
                'grid min-h-[104px] grid-cols-[1fr_auto] items-start gap-4 px-5 py-4',
                index > 0 && 'border-t border-[var(--border)] sm:border-l sm:border-t-0'
              )}
            >
              <div className="grid h-full content-between gap-2">
                <p className="text-sm font-semibold text-[var(--muted-foreground)]">
                  {metric.label}
                </p>
                <div>
                  <p className="text-3xl font-semibold leading-none tabular-nums">{metric.value}</p>
                  <p className="mt-1.5 text-xs text-[var(--muted-foreground)]">
                    {metric.description}
                  </p>
                </div>
              </div>
              <span className="grid size-9 place-items-center rounded-[var(--radius-control)] bg-[var(--accent-soft)] text-[var(--accent)]">
                <Icon className="size-4" aria-hidden="true" />
              </span>
            </div>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] shadow-[0_10px_30px_rgba(92,48,26,0.06)]">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-[var(--accent)]" aria-hidden="true" />
            <h2 className="font-semibold">Subscriber directory</h2>
            <span className="rounded-[var(--radius-control)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-semibold tabular-nums">
              {subscribers.length}
            </span>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Read-only consent status and minimized evidence.
          </p>
        </div>
        <form
          action="/admin/newsletter"
          className="grid gap-2 border-b border-[var(--border)] bg-[var(--surface-muted)]/35 p-4 sm:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_150px_145px_150px_auto]"
        >
          <label>
            <span className="sr-only">Search email</span>
            <Input
              name="search"
              defaultValue={filters.search}
              placeholder="Search email"
              className="min-h-10 text-sm"
            />
          </label>
          <Select name="status" defaultValue={filters.status}>
            <SelectTrigger aria-label="Status" className="h-10 min-h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="subscribed">Subscribed</SelectItem>
              <SelectItem value="unsubscribed">Unsubscribed</SelectItem>
            </SelectContent>
          </Select>
          <Select name="locale" defaultValue={filters.locale}>
            <SelectTrigger aria-label="Locale" className="h-10 min-h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All locales</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="vi">Vietnamese</SelectItem>
            </SelectContent>
          </Select>
          <Select name="market" defaultValue={filters.market}>
            <SelectTrigger aria-label="Market" className="h-10 min-h-10 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All markets</SelectItem>
              <SelectItem value="intl">International</SelectItem>
              <SelectItem value="vn">Vietnam</SelectItem>
            </SelectContent>
          </Select>
          <Button type="submit" className="min-h-10 px-4 text-sm">
            Apply filters
          </Button>
        </form>

        {subscribers.length === 0 ? (
          <AdminEmptyState
            icon={Mail}
            title="No subscribers match these filters."
            description="Try widening the status, locale, or market filters."
          />
        ) : (
          <>
            <div className="hidden md:block">
              <table className="w-full table-fixed border-collapse text-left text-sm">
                <colgroup>
                  <col className="w-[32%]" />
                  <col className="w-[16%]" />
                  <col className="w-[18%]" />
                  <col className="w-[34%]" />
                </colgroup>
                <thead className="bg-[var(--surface-muted)]/65 text-xs uppercase text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-5 py-3 font-semibold">Email</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Audience</th>
                    <th className="px-5 py-3 font-semibold">Latest consent</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {subscribers.map((subscriber) => (
                    <tr key={subscriber.email} className="hover:bg-[var(--surface-muted)]/45">
                      <td className="truncate px-5 py-4 font-semibold">{subscriber.email}</td>
                      <td className="px-4 py-4">
                        <AdminStatusPill
                          tone={subscriber.status === 'subscribed' ? 'success' : 'default'}
                        >
                          {subscriber.status}
                        </AdminStatusPill>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-medium">{subscriber.latestLocale.toUpperCase()}</p>
                        <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                          {subscriber.latestMarket.toUpperCase()}
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        <ConsentDetails subscriber={subscriber} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="divide-y divide-[var(--border)] md:hidden">
              {subscribers.map((subscriber) => (
                <article key={subscriber.email} className="grid gap-3 px-4 py-4">
                  <div className="flex min-w-0 items-center justify-between gap-3">
                    <p className="truncate font-semibold">{subscriber.email}</p>
                    <AdminStatusPill
                      tone={subscriber.status === 'subscribed' ? 'success' : 'default'}
                    >
                      {subscriber.status}
                    </AdminStatusPill>
                  </div>
                  <div className="grid grid-cols-[90px_1fr] gap-3 rounded-[var(--radius-control)] bg-[var(--surface-muted)]/55 p-3 text-sm">
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Audience</p>
                      <p className="mt-1 font-semibold">
                        {subscriber.latestLocale.toUpperCase()} ·{' '}
                        {subscriber.latestMarket.toUpperCase()}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--muted-foreground)]">Latest consent</p>
                      <div className="mt-1">
                        <ConsentDetails subscriber={subscriber} />
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </section>
  );
}
