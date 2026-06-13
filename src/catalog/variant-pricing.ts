import type {CurrencyCode, MarketCode} from './types';

export type VariantPriceRow = {
  marketCode: MarketCode;
  enabled: boolean;
  currencyCode: CurrencyCode;
  priceMinor: number | null;
};

export type EffectiveVariantPrice =
  | {
      source: 'variant' | 'parent';
      marketCode: MarketCode;
      currencyCode: CurrencyCode;
      priceMinor: number;
    }
  | {
      source: 'none';
      marketCode: MarketCode;
    };

export function resolveEffectiveVariantPrice({
  marketCode,
  parentOffers,
  variantOverrides
}: {
  marketCode: MarketCode;
  parentOffers: VariantPriceRow[];
  variantOverrides: VariantPriceRow[];
}): EffectiveVariantPrice {
  const override = variantOverrides.find(
    (offer) => offer.marketCode === marketCode && offer.enabled && offer.priceMinor !== null
  );
  if (override?.priceMinor !== null && override?.priceMinor !== undefined) {
    return {
      source: 'variant',
      marketCode,
      currencyCode: override.currencyCode,
      priceMinor: override.priceMinor
    };
  }

  const parent = parentOffers.find((offer) => offer.marketCode === marketCode && offer.enabled && offer.priceMinor !== null);
  if (parent?.priceMinor !== null && parent?.priceMinor !== undefined) {
    return {
      source: 'parent',
      marketCode,
      currencyCode: parent.currencyCode,
      priceMinor: parent.priceMinor
    };
  }

  return {source: 'none', marketCode};
}
