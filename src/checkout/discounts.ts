import type {CurrencyCode} from '@/catalog/money';
import type {MarketCode} from '@/catalog/market';
import type {CartFulfillmentType} from './types';

export type DiscountType = 'percentage' | 'fixed';
export type DiscountFailureReason =
  | 'not_found'
  | 'inactive'
  | 'not_started'
  | 'expired'
  | 'usage_exhausted'
  | 'wrong_market'
  | 'wrong_currency'
  | 'minimum_subtotal'
  | 'customer_required'
  | 'customer_not_eligible'
  | 'no_eligible_lines';

export type DiscountRule = {
  id: string;
  code: string;
  discountType: DiscountType;
  percentageBps: number | null;
  amountMinor: number | null;
  currencyCode: CurrencyCode | null;
  market: MarketCode | null;
  startsAt: string | null;
  endsAt: string | null;
  active: boolean;
  usageLimit: number | null;
  usedCount: number;
  minimumSubtotalMinor: number;
  eligibleCustomerIds: string[];
  eligibleProductIds: string[];
  eligibleCategoryIds: string[];
  eligibleCollectionIds: string[];
};

export type DiscountQuoteLine = {
  lineId: string;
  productId: string;
  variantId: string | null;
  categoryIds: string[];
  collectionIds: string[];
  fulfillmentType: CartFulfillmentType;
  quantity: number;
  currencyCode: CurrencyCode;
  lineSubtotalMinor: number;
};

export type DiscountAllocation = {
  status: 'applied';
  discountMinor: number;
  allocations: {lineId: string; amountMinor: number}[];
};

export type DiscountValidationInput = {
  code: string;
  market: MarketCode;
  currencyCode: CurrencyCode;
  subtotalMinor: number;
  now: Date;
  userId: string | null;
  lines: DiscountQuoteLine[];
};

export type DiscountValidationResult =
  | {status: 'eligible'; rule: DiscountRule; allocation: DiscountAllocation}
  | {status: 'not_eligible'; reason: DiscountFailureReason};

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function hasRestrictions(rule: DiscountRule) {
  return (
    rule.eligibleProductIds.length > 0 ||
    rule.eligibleCategoryIds.length > 0 ||
    rule.eligibleCollectionIds.length > 0
  );
}

function eligibleLines(rule: DiscountRule, lines: DiscountQuoteLine[]) {
  if (!hasRestrictions(rule)) {
    return lines.filter((line) => line.lineSubtotalMinor > 0);
  }

  return lines.filter((line) => {
    if (line.lineSubtotalMinor <= 0) {
      return false;
    }
    return (
      rule.eligibleProductIds.includes(line.productId) ||
      line.categoryIds.some((categoryId) => rule.eligibleCategoryIds.includes(categoryId)) ||
      line.collectionIds.some((collectionId) => rule.eligibleCollectionIds.includes(collectionId))
    );
  });
}

function allocateMinorAmount(amountMinor: number, lines: DiscountQuoteLine[]) {
  const subtotalMinor = lines.reduce((total, line) => total + line.lineSubtotalMinor, 0);
  if (subtotalMinor <= 0 || amountMinor <= 0) {
    return [];
  }

  const base = lines
    .map((line, index) => {
      const raw = (amountMinor * line.lineSubtotalMinor) / subtotalMinor;
      const floor = Math.floor(raw);
      return {line, index, amountMinor: floor, remainder: raw - floor};
    })
    .sort((left, right) => right.remainder - left.remainder || left.line.lineId.localeCompare(right.line.lineId));

  let remaining = amountMinor - base.reduce((total, item) => total + item.amountMinor, 0);
  for (const item of base) {
    if (remaining <= 0) {
      break;
    }
    item.amountMinor += 1;
    remaining -= 1;
  }

  return base
    .sort((left, right) => left.index - right.index)
    .filter((item) => item.amountMinor > 0)
    .map((item) => ({lineId: item.line.lineId, amountMinor: item.amountMinor}));
}

export function allocateDiscount({
  rule,
  currencyCode,
  lines
}: {
  rule: DiscountRule;
  currencyCode: CurrencyCode;
  lines: DiscountQuoteLine[];
}): DiscountAllocation | {status: 'not_eligible'; reason: DiscountFailureReason} {
  if (rule.discountType === 'fixed' && rule.currencyCode !== currencyCode) {
    return {status: 'not_eligible', reason: 'wrong_currency'};
  }

  const eligible = eligibleLines(rule, lines);
  const eligibleSubtotalMinor = eligible.reduce((total, line) => total + line.lineSubtotalMinor, 0);
  if (eligibleSubtotalMinor <= 0) {
    return {status: 'not_eligible', reason: 'no_eligible_lines'};
  }

  const discountMinor =
    rule.discountType === 'percentage'
      ? Math.floor((eligibleSubtotalMinor * (rule.percentageBps ?? 0)) / 10000)
      : Math.min(rule.amountMinor ?? 0, eligibleSubtotalMinor);

  if (discountMinor <= 0) {
    return {status: 'not_eligible', reason: 'no_eligible_lines'};
  }

  return {
    status: 'applied',
    discountMinor,
    allocations: allocateMinorAmount(discountMinor, eligible)
  };
}

export function validateDiscountCode(
  rule: DiscountRule | null,
  input: DiscountValidationInput
): DiscountValidationResult {
  if (!rule || normalizeCode(rule.code) !== normalizeCode(input.code)) {
    return {status: 'not_eligible', reason: 'not_found'};
  }
  if (!rule.active) {
    return {status: 'not_eligible', reason: 'inactive'};
  }
  if (rule.startsAt && input.now < new Date(rule.startsAt)) {
    return {status: 'not_eligible', reason: 'not_started'};
  }
  if (rule.endsAt && input.now > new Date(rule.endsAt)) {
    return {status: 'not_eligible', reason: 'expired'};
  }
  if (rule.usageLimit !== null && rule.usedCount >= rule.usageLimit) {
    return {status: 'not_eligible', reason: 'usage_exhausted'};
  }
  if (rule.market && rule.market !== input.market) {
    return {status: 'not_eligible', reason: 'wrong_market'};
  }
  if (rule.discountType === 'fixed' && rule.currencyCode !== input.currencyCode) {
    return {status: 'not_eligible', reason: 'wrong_currency'};
  }
  if (input.subtotalMinor < rule.minimumSubtotalMinor) {
    return {status: 'not_eligible', reason: 'minimum_subtotal'};
  }
  if (rule.eligibleCustomerIds.length > 0 && !input.userId) {
    return {status: 'not_eligible', reason: 'customer_required'};
  }
  if (rule.eligibleCustomerIds.length > 0 && input.userId && !rule.eligibleCustomerIds.includes(input.userId)) {
    return {status: 'not_eligible', reason: 'customer_not_eligible'};
  }

  const allocation = allocateDiscount({rule, currencyCode: input.currencyCode, lines: input.lines});
  if (allocation.status === 'not_eligible') {
    return allocation;
  }
  return {status: 'eligible', rule, allocation};
}
