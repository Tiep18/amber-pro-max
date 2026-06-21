import type {AdminNewsletterFilters, AdminNewsletterSubscriber} from '@/newsletter/admin-queries';

type SubscriberListProps = {
  subscribers: AdminNewsletterSubscriber[];
  filters: Required<AdminNewsletterFilters>;
};

function formatDate(value: string | null) {
  if (!value) {
    return 'None';
  }
  return new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC'
  }).format(new Date(value));
}

function option(label: string, value: string) {
  return <option value={value}>{label}</option>;
}

export function SubscriberList({subscribers, filters}: SubscriberListProps) {
  return (
    <section className="grid gap-4">
      <form action="/admin/newsletter" className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:grid-cols-[1.3fr_repeat(3,0.7fr)_auto]">
        <label className="grid gap-1 text-sm font-semibold">
          Search email
          <input
            name="search"
            defaultValue={filters.search}
            className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] px-3 font-normal"
          />
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Status
          <select name="status" defaultValue={filters.status} className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] px-3 font-normal">
            {option('All', 'all')}
            {option('Subscribed', 'subscribed')}
            {option('Unsubscribed', 'unsubscribed')}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Locale
          <select name="locale" defaultValue={filters.locale} className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] px-3 font-normal">
            {option('All', 'all')}
            {option('English', 'en')}
            {option('Vietnamese', 'vi')}
          </select>
        </label>
        <label className="grid gap-1 text-sm font-semibold">
          Market
          <select name="market" defaultValue={filters.market} className="min-h-11 rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--background)] px-3 font-normal">
            {option('All', 'all')}
            {option('International', 'intl')}
            {option('Vietnam', 'vn')}
          </select>
        </label>
        <button className="min-h-11 self-end rounded-[var(--radius-control)] bg-[var(--accent)] px-4 font-semibold text-white" type="submit">
          Apply
        </button>
      </form>

      {subscribers.length === 0 ? (
        <p className="rounded-[var(--radius-card)] border border-[var(--border)] p-4 text-[var(--muted-foreground)]">No subscribers match these filters.</p>
      ) : (
        <div className="overflow-x-auto rounded-[var(--radius-card)] border border-[var(--border)]">
          <table className="w-full min-w-[880px] border-collapse text-left text-sm">
            <thead className="bg-[var(--surface-muted)] text-xs uppercase text-[var(--muted-foreground)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Locale</th>
                <th className="px-4 py-3 font-semibold">Market</th>
                <th className="px-4 py-3 font-semibold">Latest consent</th>
                <th className="px-4 py-3 font-semibold">Evidence</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((subscriber) => (
                <tr key={subscriber.email} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3 font-semibold">{subscriber.email}</td>
                  <td className="px-4 py-3">{subscriber.status}</td>
                  <td className="px-4 py-3">{subscriber.latestLocale.toUpperCase()}</td>
                  <td className="px-4 py-3">{subscriber.latestMarket.toUpperCase()}</td>
                  <td className="px-4 py-3">
                    {subscriber.latestConsent ? (
                      <span>
                        {subscriber.latestConsent.eventType} / {subscriber.latestConsent.source}
                        <br />
                        <span className="text-[var(--muted-foreground)]">{formatDate(subscriber.latestConsent.occurredAt)}</span>
                      </span>
                    ) : (
                      'None'
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {subscriber.latestConsent?.hasIpEvidence || subscriber.latestConsent?.hasUserAgentEvidence ? 'Has minimized evidence' : 'No evidence'}
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
