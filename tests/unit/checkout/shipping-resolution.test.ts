import {describe, expect, test} from 'vitest';
import {
  resolveShippingCandidates,
  type ShippingProfileCandidate,
  type ShippingResolutionLine
} from '@/checkout/shipping-resolution';

const profile = (
  id: string,
  rules: ShippingProfileCandidate['rules'],
  input: Partial<ShippingProfileCandidate> = {}
): ShippingProfileCandidate => ({active: true, id, name: id, rules, ...input});

const exactRule = (
  id: string,
  firstItemFeeMinor: number,
  additionalItemFeeMinor: number,
  input: Partial<ShippingProfileCandidate['rules'][number]> = {}
): ShippingProfileCandidate['rules'][number] => ({
  active: true,
  additionalItemFeeMinor,
  countryCode: 'US',
  currencyCode: 'USD',
  firstItemFeeMinor,
  id,
  matchKind: 'exact_country',
  regionAdjustments: [],
  ...input
});

const fallbackRule = (
  id: string,
  firstItemFeeMinor: number,
  additionalItemFeeMinor: number,
  input: Partial<ShippingProfileCandidate['rules'][number]> = {}
): ShippingProfileCandidate['rules'][number] =>
  exactRule(id, firstItemFeeMinor, additionalItemFeeMinor, {
    countryCode: null,
    matchKind: 'fallback',
    ...input
  });

const line = (input: Partial<ShippingResolutionLine> = {}): ShippingResolutionLine => ({
  lineId: 'line-1',
  productId: 'product-1',
  quantity: 1,
  variantId: null,
  variantProfile: null,
  productProfile: null,
  ...input
});

describe('resolveShippingCandidates', () => {
  const precedenceCases = [
    {
      name: 'variant exact',
      expected: ['variant', 'exact_country', 'variant-exact'],
      input: line({
        variantId: 'variant-1',
        variantProfile: profile('variant', [fallbackRule('variant-fallback', 200, 20), exactRule('variant-exact', 100, 10)]),
        productProfile: profile('product', [exactRule('product-exact', 300, 30)])
      })
    },
    {
      name: 'variant fallback',
      expected: ['variant', 'fallback', 'variant-fallback'],
      input: line({
        variantId: 'variant-1',
        variantProfile: profile('variant', [fallbackRule('variant-fallback', 200, 20)]),
        productProfile: profile('product', [exactRule('product-exact', 300, 30)])
      })
    },
    {
      name: 'product exact',
      expected: ['product', 'exact_country', 'product-exact'],
      input: line({
        variantId: 'variant-1',
        variantProfile: profile('inactive-variant', [exactRule('ignored', 1, 1)], {active: false}),
        productProfile: profile('product', [fallbackRule('product-fallback', 400, 40), exactRule('product-exact', 300, 30)])
      })
    },
    {
      name: 'product fallback',
      expected: ['product', 'fallback', 'product-fallback'],
      input: line({productProfile: profile('product', [fallbackRule('product-fallback', 400, 40)])})
    },
    {
      name: 'store default exact',
      expected: ['store_default', 'exact_country', 'default-exact'],
      input: line()
    },
    {
      name: 'store default fallback',
      expected: ['store_default', 'fallback', 'default-fallback'],
      input: line()
    }
  ] as const;

  test.each(precedenceCases)('selects $name at its fixed precedence', ({name, input, expected}) => {
    const defaultRules =
      name === 'store default fallback'
        ? [fallbackRule('default-fallback', 600, 60)]
        : [fallbackRule('default-fallback', 600, 60), exactRule('default-exact', 500, 50)];
    const result = resolveShippingCandidates({
      countryCode: ' us ',
      currencyCode: 'USD',
      lines: [input],
      regionCode: null,
      storeDefaultProfile: profile('default', defaultRules)
    });

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect([result.allocations[0]?.source, result.allocations[0]?.ruleMatchKind, result.allocations[0]?.shippingRuleId]).toEqual(expected);
  });

  test('is independent of candidate insertion order and always prefers exact within a tier', () => {
    const rules = [fallbackRule('fallback', 900, 90), exactRule('exact', 100, 10)];
    const resolve = (orderedRules: typeof rules) =>
      resolveShippingCandidates({
        countryCode: 'US',
        currencyCode: 'USD',
        lines: [line({productProfile: profile('product', orderedRules)})],
        regionCode: null,
        storeDefaultProfile: null
      });

    expect(resolve(rules)).toEqual(resolve([...rules].reverse()));
    expect(resolve(rules)).toMatchObject({status: 'ready', allocations: [{shippingRuleId: 'exact'}]});
  });

  test('skips inactive profiles, rules, defaults, adjustments, and cross-currency candidates', () => {
    const result = resolveShippingCandidates({
      countryCode: 'US',
      currencyCode: 'USD',
      lines: [
        line({
          variantProfile: profile('inactive', [exactRule('inactive-profile-rule', 1, 1)], {active: false}),
          productProfile: profile('product', [
            exactRule('inactive-rule', 2, 2, {active: false}),
            exactRule('wrong-currency', 3, 3, {currencyCode: 'VND'}),
            fallbackRule('eligible-fallback', 400, 40, {
              regionAdjustments: [
                {
                  active: false,
                  additionalItemFeeMinor: 999,
                  countryCode: 'US',
                  firstItemFeeMinor: 999,
                  id: 'inactive-adjustment',
                  mode: 'replace',
                  regionCode: 'CA'
                }
              ]
            })
          ])
        })
      ],
      regionCode: 'CA',
      storeDefaultProfile: profile('inactive-default', [exactRule('default', 8, 8)], {active: false})
    });

    expect(result).toMatchObject({
      status: 'ready',
      allocations: [{finalFirstItemFeeMinor: 400, regionAdjustmentId: null, shippingRuleId: 'eligible-fallback'}]
    });
  });

  test.each([
    ['surcharge', 1200, 350, 1500, 425],
    ['replace', 1200, 350, 700, 125]
  ] as const)('applies normalized region %s arithmetic to both fees', (mode, baseFirst, baseAdditional, finalFirst, finalAdditional) => {
    const result = resolveShippingCandidates({
      countryCode: 'US',
      currencyCode: 'USD',
      lines: [
        line({
          productProfile: profile('product', [
            exactRule('us-rule', baseFirst, baseAdditional, {
              regionAdjustments: [
                {
                  active: true,
                  additionalItemFeeMinor: 75,
                  countryCode: 'US',
                  firstItemFeeMinor: mode === 'replace' ? 700 : 300,
                  id: `${mode}-ca`,
                  mode,
                  regionCode: 'CA'
                }
              ]
            })
          ])
        })
      ],
      regionCode: ' ca ',
      storeDefaultProfile: null
    });

    expect(result).toMatchObject({
      status: 'ready',
      allocations: [{finalAdditionalItemFeeMinor: finalAdditional, finalFirstItemFeeMinor: finalFirst, regionMode: mode}]
    });
  });

  test('returns a sanitized unsupported failure with every affected line and no amount', () => {
    const result = resolveShippingCandidates({
      countryCode: 'CA',
      currencyCode: 'USD',
      lines: [line({lineId: 'z-line'}), line({lineId: 'a-line'})],
      regionCode: null,
      storeDefaultProfile: null
    });

    expect(result).toEqual({code: 'unsupported_destination', status: 'error', unsupportedLineIds: ['a-line', 'z-line']});
    expect(result).not.toHaveProperty('amountMinor');
  });

  test.each([
    [{countryCode: 'USA'}, 'invalid_country'],
    [{regionCode: 'california'}, 'invalid_region'],
    [{lines: []}, 'invalid_lines'],
    [{lines: [line({quantity: 0})]}, 'invalid_lines']
  ])('returns only allowlisted validation codes for malformed intent %#', (override, code) => {
    const result = resolveShippingCandidates({
      countryCode: 'US',
      currencyCode: 'USD',
      lines: [line()],
      regionCode: null,
      storeDefaultProfile: null,
      ...override
    });

    expect(result).toEqual({code, status: 'error'});
  });
});
