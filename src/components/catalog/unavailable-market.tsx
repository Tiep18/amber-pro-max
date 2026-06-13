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
    <section className="grid gap-3 border-l-4 border-[var(--warning)] bg-[var(--warning-surface)] p-4">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p>{body}</p>
      {otherMarket ? (
        <form action={setActiveMarketAction}>
          <input type="hidden" name="market" value={otherMarket} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            className="min-h-10 rounded-[var(--radius-control)] bg-[var(--accent)] px-4 font-semibold text-white hover:bg-[var(--accent-hover)]"
          >
            {switchLabel}
          </button>
        </form>
      ) : null}
    </section>
  );
}
