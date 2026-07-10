import {setActiveMarketAction} from '@/catalog/market-actions';
import type {MarketCode} from '@/catalog/market';

export function UnavailableMarket({
  title,
  body,
  otherMarket,
  returnTo,
  switchLabel
}: {
  title: string;
  body: string;
  otherMarket: MarketCode | null;
  returnTo: string;
  switchLabel: string;
}) {
  return (
    <section className="grid gap-3 rounded-[var(--radius-card)] border border-[var(--warning)]/25 bg-[var(--warning-surface)] p-4">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">{body}</p>
      {otherMarket ? (
        <form action={setActiveMarketAction}>
          <input type="hidden" name="market" value={otherMarket} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            className="min-h-10 rounded-[var(--radius-control)] bg-[var(--accent)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-hover)]"
          >
            {switchLabel}
          </button>
        </form>
      ) : null}
    </section>
  );
}
