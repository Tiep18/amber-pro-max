import type {CatalogLocale, MarketCode, PublishIssueCode} from './types';

export type PublishBlockerCode = PublishIssueCode | 'publish_requirement';
export type PublishBlockerGroup = 'translation' | 'offers' | 'media' | 'variants' | 'general';

export type PublishBlocker = {
  code: PublishBlockerCode;
  group: PublishBlockerGroup;
  field: string;
  locale?: CatalogLocale;
  marketCode?: MarketCode;
};

export type DatabasePublishIssue = {
  issue_code: string;
  locale: string | null;
  market_code: string | null;
  detail: string | null;
};

const issueMap: Record<
  PublishIssueCode,
  {group: PublishBlockerGroup; field: string}
> = {
  missing_translation: {group: 'translation', field: 'translation'},
  missing_slug: {group: 'translation', field: 'slug'},
  missing_seo_title: {group: 'translation', field: 'seoTitle'},
  missing_seo_description: {group: 'translation', field: 'seoDescription'},
  missing_social_image: {group: 'media', field: 'socialImage'},
  missing_primary_image: {group: 'media', field: 'primaryImage'},
  missing_market_offer: {group: 'offers', field: 'marketOffer'},
  invalid_market_offer: {group: 'offers', field: 'marketOffer'},
  missing_private_pdf: {group: 'media', field: 'privatePdf'},
  incompatible_product_data: {group: 'general', field: 'productType'},
  invalid_inventory: {group: 'variants', field: 'inventory'}
};

function isLocale(value: string | null): value is CatalogLocale {
  return value === 'vi' || value === 'en';
}

function isMarketCode(value: string | null): value is MarketCode {
  return value === 'vn' || value === 'intl';
}

function isPublishIssueCode(value: string): value is PublishIssueCode {
  return value in issueMap;
}

export function mapPublishIssues(issues: DatabasePublishIssue[]): PublishBlocker[] {
  return issues.map((issue) => {
    if (!isPublishIssueCode(issue.issue_code)) {
      return {
        code: 'publish_requirement',
        group: 'general',
        field: 'product'
      };
    }

    const mapped = issueMap[issue.issue_code];
    return {
      code: issue.issue_code,
      group: mapped.group,
      field: mapped.field,
      ...(isLocale(issue.locale) ? {locale: issue.locale} : {}),
      ...(isMarketCode(issue.market_code) ? {marketCode: issue.market_code} : {})
    };
  });
}
