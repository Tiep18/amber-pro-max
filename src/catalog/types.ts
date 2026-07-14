export type MarketCode = "vn" | "intl";

export type CurrencyCode = "VND" | "USD";

export type CatalogLocale = "vi" | "en";

export type ProductType = "pdf_pattern" | "physical_finished";

export type ProductStatus = "draft" | "published" | "archived";

export type PublishIssueCode =
  | "missing_translation"
  | "missing_slug"
  | "missing_seo_title"
  | "missing_seo_description"
  | "missing_social_image"
  | "missing_primary_image"
  | "missing_market_offer"
  | "invalid_market_offer"
  | "missing_private_pdf"
  | "incompatible_product_data"
  | "invalid_inventory";

export interface CatalogMoney {
  currencyCode: CurrencyCode;
  amountMinor: number;
}

export interface CatalogMarketOffer {
  marketCode: MarketCode;
  enabled: boolean;
  price: CatalogMoney | null;
}

export interface PublishIssue {
  code: PublishIssueCode;
  locale?: CatalogLocale;
  marketCode?: MarketCode;
  detail?: string;
}

export interface CatalogPublishResult {
  productId: string;
  published: boolean;
  issues: PublishIssue[];
}
