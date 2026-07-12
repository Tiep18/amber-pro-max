import type {CurrencyCode} from '@/catalog/money';
import type {ResolvedShippingAllocation} from '@/checkout/shipping-resolution';

export type ShippingRuleQuote = {
  countryCode: string;
  firstItemFeeMinor: number;
  additionalItemFeeMinor: number;
};

export type ShippingQuoteLine = {
  lineId: string;
  productId: string;
  variantId: string | null;
  fulfillmentType: 'digital' | 'physical';
  quantity: number;
  currencyCode: CurrencyCode;
  shippingProfileId: string | null;
  rule: ShippingRuleQuote | null;
  resolvedAllocation?: ResolvedShippingAllocation | null;
};

export type ChargeableShippingUnit = {
  lineId: string;
  productId: string;
  variantId: string | null;
  unitIndex: number;
  firstItemFeeMinor: number;
  additionalItemFeeMinor: number;
};

export type ShippingQuote =
  | {
      status: 'ready';
      amountMinor: number;
      currencyCode: CurrencyCode;
      countryCode: string;
      firstItemLineId: string;
      chargeableUnitCount: number;
    }
  | {
      status: 'no_shipping_required';
      amountMinor: 0;
      currencyCode: CurrencyCode;
      countryCode: string | null;
      chargeableUnitCount: 0;
    }
  | {
      status: 'unsupported_destination';
      amountMinor: null;
      currencyCode: CurrencyCode;
      countryCode: string;
      unsupportedLineIds: string[];
    };

export type CalculateShippingQuoteInput = {
  countryCode: string | null;
  currencyCode: CurrencyCode;
  lines: ShippingQuoteLine[];
};

function normalizeCountryCode(countryCode: string | null | undefined) {
  const normalized = countryCode?.trim().toUpperCase();
  return normalized && /^[A-Z]{2}$/.test(normalized) ? normalized : null;
}

function unitSortKey(unit: ChargeableShippingUnit) {
  return [unit.lineId, unit.productId, unit.variantId ?? '', String(unit.unitIndex)].join(':');
}

export function selectChargeablePhysicalUnits(lines: ShippingQuoteLine[]): ChargeableShippingUnit[] {
  return lines.flatMap((line) => {
    const firstItemFeeMinor = line.resolvedAllocation?.finalFirstItemFeeMinor ?? line.rule?.firstItemFeeMinor;
    const additionalItemFeeMinor = line.resolvedAllocation?.finalAdditionalItemFeeMinor ?? line.rule?.additionalItemFeeMinor;
    if (line.fulfillmentType !== 'physical' || line.quantity <= 0 || firstItemFeeMinor === undefined || additionalItemFeeMinor === undefined) {
      return [];
    }

    if (firstItemFeeMinor === 0 && additionalItemFeeMinor === 0) {
      return [];
    }

    return Array.from({length: line.quantity}, (_, unitIndex) => ({
      lineId: line.lineId,
      productId: line.productId,
      variantId: line.variantId,
      unitIndex,
      firstItemFeeMinor,
      additionalItemFeeMinor
    }));
  });
}

export function calculateShippingQuote(input: CalculateShippingQuoteInput): ShippingQuote {
  const countryCode = normalizeCountryCode(input.countryCode);
  const physicalLines = input.lines.filter((line) => line.fulfillmentType === 'physical' && line.quantity > 0);

  if (physicalLines.length === 0) {
    return {
      status: 'no_shipping_required',
      amountMinor: 0,
      currencyCode: input.currencyCode,
      countryCode,
      chargeableUnitCount: 0
    };
  }

  if (!countryCode) {
    return {
      status: 'unsupported_destination',
      amountMinor: null,
      currencyCode: input.currencyCode,
      countryCode: '',
      unsupportedLineIds: physicalLines.map((line) => line.lineId).sort()
    };
  }

  const unsupportedLineIds = physicalLines
    .filter((line) => {
      if (line.resolvedAllocation) {
        return (
          line.resolvedAllocation.destinationCountryCode !== countryCode ||
          line.resolvedAllocation.currencyCode !== input.currencyCode
        );
      }
      return !line.rule || line.rule.countryCode.toUpperCase() !== countryCode;
    })
    .map((line) => line.lineId)
    .sort();

  if (unsupportedLineIds.length > 0) {
    return {
      status: 'unsupported_destination',
      amountMinor: null,
      currencyCode: input.currencyCode,
      countryCode,
      unsupportedLineIds
    };
  }

  const units = selectChargeablePhysicalUnits(physicalLines).sort((a, b) => {
    const firstFee = b.firstItemFeeMinor - a.firstItemFeeMinor;
    return firstFee !== 0 ? firstFee : unitSortKey(a).localeCompare(unitSortKey(b));
  });

  if (units.length === 0) {
    return {
      status: 'no_shipping_required',
      amountMinor: 0,
      currencyCode: input.currencyCode,
      countryCode,
      chargeableUnitCount: 0
    };
  }

  const [firstUnit, ...remainingUnits] = units;
  return {
    status: 'ready',
    amountMinor:
      firstUnit.firstItemFeeMinor +
      remainingUnits.reduce((total, unit) => total + unit.additionalItemFeeMinor, 0),
    currencyCode: input.currencyCode,
    countryCode,
    firstItemLineId: firstUnit.lineId,
    chargeableUnitCount: units.length
  };
}
