import type {CurrencyCode} from '@/catalog/money';

export type ShippingMatchSource = 'variant' | 'product' | 'store_default';
export type ShippingRuleMatchKind = 'exact_country' | 'fallback';
export type ShippingRegionMode = 'surcharge' | 'replace';

export type ShippingRegionAdjustmentCandidate = {
  id: string;
  countryCode: string;
  regionCode: string;
  mode: ShippingRegionMode;
  firstItemFeeMinor: number;
  additionalItemFeeMinor: number;
  active: boolean;
};

export type ShippingRuleCandidate = {
  id: string;
  matchKind: ShippingRuleMatchKind;
  countryCode: string | null;
  currencyCode: CurrencyCode;
  firstItemFeeMinor: number;
  additionalItemFeeMinor: number;
  active: boolean;
  regionAdjustments: ShippingRegionAdjustmentCandidate[];
};

export type ShippingProfileCandidate = {
  id: string;
  name: string;
  active: boolean;
  rules: ShippingRuleCandidate[];
};

export type ShippingResolutionLine = {
  lineId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  variantProfile: ShippingProfileCandidate | null;
  productProfile: ShippingProfileCandidate | null;
};

export type ResolvedShippingAllocation = {
  lineId: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  source: ShippingMatchSource;
  shippingProfileId: string;
  profileName: string;
  shippingRuleId: string;
  ruleMatchKind: ShippingRuleMatchKind;
  destinationCountryCode: string;
  currencyCode: CurrencyCode;
  baseFirstItemFeeMinor: number;
  baseAdditionalItemFeeMinor: number;
  regionAdjustmentId: string | null;
  regionCode: string | null;
  regionMode: ShippingRegionMode | null;
  regionFirstItemFeeMinor: number | null;
  regionAdditionalItemFeeMinor: number | null;
  finalFirstItemFeeMinor: number;
  finalAdditionalItemFeeMinor: number;
};

export type ShippingResolutionFailure =
  | {status: 'error'; code: 'invalid_country' | 'invalid_currency' | 'invalid_region' | 'invalid_lines' | 'resolver_invariant'}
  | {status: 'error'; code: 'unsupported_destination'; unsupportedLineIds: string[]};

export type ShippingResolutionResult =
  | {
      status: 'ready';
      countryCode: string;
      currencyCode: CurrencyCode;
      regionCode: string | null;
      allocations: ResolvedShippingAllocation[];
    }
  | ShippingResolutionFailure;

export type ResolveShippingCandidatesInput = {
  countryCode: string;
  currencyCode: CurrencyCode;
  regionCode: string | null;
  lines: ShippingResolutionLine[];
  storeDefaultProfile: ShippingProfileCandidate | null;
};

const MAX_LINES = 100;
const MAX_FEE_MINOR = 2_147_483_647;

function normalizedCode(value: string | null | undefined, pattern: RegExp) {
  const normalized = value?.trim().toUpperCase();
  return normalized && pattern.test(normalized) ? normalized : null;
}

function validFee(value: number) {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_FEE_MINOR;
}

function selectRule(
  profile: ShippingProfileCandidate | null,
  countryCode: string,
  currencyCode: CurrencyCode,
  matchKind: ShippingRuleMatchKind
) {
  if (!profile?.active) return null;

  const matches = profile.rules.filter(
    (rule) =>
      rule.active &&
      rule.currencyCode === currencyCode &&
      rule.matchKind === matchKind &&
      validFee(rule.firstItemFeeMinor) &&
      validFee(rule.additionalItemFeeMinor) &&
      (matchKind === 'fallback' ? rule.countryCode === null : rule.countryCode === countryCode)
  );

  return matches.length === 1 ? matches[0] : matches.length === 0 ? null : 'ambiguous';
}

function resolveLine(
  line: ShippingResolutionLine,
  countryCode: string,
  currencyCode: CurrencyCode,
  regionCode: string | null,
  storeDefaultProfile: ShippingProfileCandidate | null
): ResolvedShippingAllocation | null | 'invariant' {
  const tiers: Array<[ShippingMatchSource, ShippingProfileCandidate | null]> = [
    ['variant', line.variantProfile],
    ['product', line.productProfile],
    ['store_default', storeDefaultProfile]
  ];

  let selected: {source: ShippingMatchSource; profile: ShippingProfileCandidate; rule: ShippingRuleCandidate} | null = null;
  for (const [source, profile] of tiers) {
    for (const matchKind of ['exact_country', 'fallback'] as const) {
      const rule = selectRule(profile, countryCode, currencyCode, matchKind);
      if (rule === 'ambiguous') return 'invariant';
      if (rule && profile) {
        selected = {source, profile, rule};
        break;
      }
    }
    if (selected) break;
  }

  if (!selected) return null;

  const adjustments = regionCode
    ? selected.rule.regionAdjustments.filter(
        (adjustment) =>
          adjustment.active &&
          normalizedCode(adjustment.countryCode, /^[A-Z]{2}$/) === countryCode &&
          normalizedCode(adjustment.regionCode, /^[A-Z0-9]{1,3}$/) === regionCode &&
          validFee(adjustment.firstItemFeeMinor) &&
          validFee(adjustment.additionalItemFeeMinor)
      )
    : [];
  if (adjustments.length > 1) return 'invariant';

  const adjustment = adjustments[0] ?? null;
  const finalFirstItemFeeMinor = adjustment
    ? adjustment.mode === 'replace'
      ? adjustment.firstItemFeeMinor
      : selected.rule.firstItemFeeMinor + adjustment.firstItemFeeMinor
    : selected.rule.firstItemFeeMinor;
  const finalAdditionalItemFeeMinor = adjustment
    ? adjustment.mode === 'replace'
      ? adjustment.additionalItemFeeMinor
      : selected.rule.additionalItemFeeMinor + adjustment.additionalItemFeeMinor
    : selected.rule.additionalItemFeeMinor;

  if (!validFee(finalFirstItemFeeMinor) || !validFee(finalAdditionalItemFeeMinor)) return 'invariant';

  return {
    lineId: line.lineId,
    productId: line.productId,
    variantId: line.variantId,
    quantity: line.quantity,
    source: selected.source,
    shippingProfileId: selected.profile.id,
    profileName: selected.profile.name,
    shippingRuleId: selected.rule.id,
    ruleMatchKind: selected.rule.matchKind,
    destinationCountryCode: countryCode,
    currencyCode,
    baseFirstItemFeeMinor: selected.rule.firstItemFeeMinor,
    baseAdditionalItemFeeMinor: selected.rule.additionalItemFeeMinor,
    regionAdjustmentId: adjustment?.id ?? null,
    regionCode: adjustment ? regionCode : null,
    regionMode: adjustment?.mode ?? null,
    regionFirstItemFeeMinor: adjustment?.firstItemFeeMinor ?? null,
    regionAdditionalItemFeeMinor: adjustment?.additionalItemFeeMinor ?? null,
    finalFirstItemFeeMinor,
    finalAdditionalItemFeeMinor
  };
}

export function resolveShippingCandidates(input: ResolveShippingCandidatesInput): ShippingResolutionResult {
  const countryCode = normalizedCode(input.countryCode, /^[A-Z]{2}$/);
  if (!countryCode) return {status: 'error', code: 'invalid_country'};
  if (input.currencyCode !== 'VND' && input.currencyCode !== 'USD') return {status: 'error', code: 'invalid_currency'};

  const regionCode = input.regionCode === null ? null : normalizedCode(input.regionCode, /^[A-Z0-9]{1,3}$/);
  if (input.regionCode !== null && !regionCode) return {status: 'error', code: 'invalid_region'};
  if (
    input.lines.length === 0 ||
    input.lines.length > MAX_LINES ||
    input.lines.some(
      (line) =>
        !line.lineId.trim() ||
        !line.productId.trim() ||
        !Number.isSafeInteger(line.quantity) ||
        line.quantity <= 0
    )
  ) {
    return {status: 'error', code: 'invalid_lines'};
  }

  const allocations: ResolvedShippingAllocation[] = [];
  const unsupportedLineIds: string[] = [];
  for (const line of input.lines) {
    const allocation = resolveLine(line, countryCode, input.currencyCode, regionCode, input.storeDefaultProfile);
    if (allocation === 'invariant') return {status: 'error', code: 'resolver_invariant'};
    if (allocation) allocations.push(allocation);
    else unsupportedLineIds.push(line.lineId);
  }

  if (unsupportedLineIds.length > 0) {
    return {status: 'error', code: 'unsupported_destination', unsupportedLineIds: unsupportedLineIds.sort()};
  }

  return {status: 'ready', countryCode, currencyCode: input.currencyCode, regionCode, allocations};
}
