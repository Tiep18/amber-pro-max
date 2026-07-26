'use client';

import { useEffect, useRef, useState } from 'react';
import type { MarketCode } from '@/catalog/market';
import type { ProductCommerceProjection } from '@/catalog/projections';
import { AddToCart } from '@/components/catalog/add-to-cart';
import { UnavailableMarket } from '@/components/catalog/unavailable-market';
import type { PublicVariant } from '@/components/catalog/variant-selector';
import { useStorefrontContext } from '@/components/storefront-context';
import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Locale } from '@/i18n/routing';

export type ProductProjectionRequestIdentity = {
  requestId: number;
  generation: number;
  contextVersion: number;
  market: MarketCode;
  locale: Locale;
  productSlug: string;
};

type ProductProjectionWithContext = ProductCommerceProjection & {
  generation: number;
  contextVersion: number;
};

type ProductCommerceState =
  | { status: 'resolving' | 'retrying'; projection: null }
  | { status: 'error'; projection: null }
  | { status: 'ready'; projection: ProductProjectionWithContext };

type ProductProjectionResponse = {
  status: 'ready';
  projection: ProductCommerceProjection;
};

const copy = {
  en: {
    checking: 'Checking availability…',
    checkingAgain: 'Checking again…',
    errorTitle: 'We couldn’t confirm this offer.',
    errorBody: 'Try again before adding this product to your cart.',
    retry: 'Try again',
    unavailableTitle: 'Unavailable in this shopping region',
    unavailableBody: 'This product cannot be purchased in your current shopping region.',
    switchToVietnam: 'Switch to Vietnam',
    switchToInternational: 'Switch to International',
    marketPending: 'Changing shopping region…',
    marketFailure:
      'We couldn’t change your shopping region. Your previous selection is still active.',
    retryMarket: 'Try changing region again'
  },
  vi: {
    checking: 'Đang kiểm tra tình trạng hàng…',
    checkingAgain: 'Đang kiểm tra lại…',
    errorTitle: 'Không thể xác nhận ưu đãi này.',
    errorBody: 'Hãy thử lại trước khi thêm sản phẩm vào giỏ hàng.',
    retry: 'Thử lại',
    unavailableTitle: 'Không có sẵn tại khu vực mua sắm này',
    unavailableBody: 'Không thể mua sản phẩm này tại khu vực mua sắm hiện tại của bạn.',
    switchToVietnam: 'Chuyển sang Việt Nam',
    switchToInternational: 'Chuyển sang Quốc tế',
    marketPending: 'Đang đổi khu vực mua sắm…',
    marketFailure: 'Không thể đổi khu vực mua sắm. Lựa chọn trước đó vẫn đang được áp dụng.',
    retryMarket: 'Thử đổi lại khu vực'
  }
} as const;

export function isCurrentProductProjectionRequest(
  current: ProductProjectionRequestIdentity | null,
  completed: ProductProjectionRequestIdentity
) {
  return (
    current?.requestId === completed.requestId &&
    current.generation === completed.generation &&
    current.contextVersion === completed.contextVersion &&
    current.market === completed.market &&
    current.locale === completed.locale &&
    current.productSlug === completed.productSlug
  );
}

function isProductProjectionResponse(value: unknown): value is ProductProjectionResponse {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const response = value as { status?: unknown; projection?: unknown };
  if (
    response.status !== 'ready' ||
    !response.projection ||
    typeof response.projection !== 'object' ||
    Array.isArray(response.projection)
  ) {
    return false;
  }

  const projection = response.projection as Partial<ProductCommerceProjection>;
  return (
    typeof projection.productId === 'string' &&
    typeof projection.slug === 'string' &&
    (projection.locale === 'vi' || projection.locale === 'en') &&
    (projection.market === 'vn' || projection.market === 'intl') &&
    (projection.productType === 'pdf_pattern' || projection.productType === 'physical_finished') &&
    typeof projection.available === 'boolean' &&
    typeof projection.inStock === 'boolean' &&
    typeof projection.offerFingerprint === 'string' &&
    Array.isArray(projection.variants)
  );
}

function publicVariants(projection: ProductCommerceProjection): PublicVariant[] {
  return projection.variants.map((variant) => ({
    variant_id: variant.variantId,
    sku: variant.sku,
    attributes: variant.attributes,
    display_order: variant.displayOrder,
    enabled: variant.enabled,
    currency_code: variant.currencyCode,
    price_minor: variant.priceMinor,
    stock: variant.stock > 0
  }));
}

function ProductCommerceSkeleton({ locale, retrying }: { locale: Locale; retrying: boolean }) {
  const status = retrying ? copy[locale].checkingAgain : copy[locale].checking;
  return (
    <section className="grid min-h-[220px] content-start gap-4" aria-busy="true">
      <div aria-hidden="true" className="grid gap-4">
        <Skeleton className="h-10 w-40" />
        <div className="grid gap-2">
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-12 w-full" />
      </div>
      <p aria-live="polite" aria-atomic="true" className="text-sm text-[var(--muted-foreground)]">
        {status}
      </p>
    </section>
  );
}

export function ProductCommerce({
  locale,
  productSlug,
  productId,
  title,
  productType
}: {
  locale: Locale;
  productSlug: string;
  productId: string;
  title: string;
  productType: 'pdf_pattern' | 'physical_finished';
}) {
  const context = useStorefrontContext();
  const [retryNonce, setRetryNonce] = useState(0);
  const [state, setState] = useState<ProductCommerceState>({
    status: 'resolving',
    projection: null
  });
  const requestSequence = useRef(0);
  const activeRequest = useRef<ProductProjectionRequestIdentity | null>(null);

  useEffect(() => {
    if (context.status !== 'ready' || !context.purchaseSafe || context.market === null) {
      activeRequest.current = null;
      setState((current) => {
        const keepsUnavailableRecoveryVisible =
          current.status === 'ready' &&
          !current.projection.available &&
          context.market !== null &&
          current.projection.market === context.market &&
          (context.pendingMarket !== null || context.issue?.code === 'market_mutation_failed');

        if (keepsUnavailableRecoveryVisible) {
          return current;
        }

        return {
          status:
            context.status === 'error'
              ? 'error'
              : context.status === 'retrying'
                ? 'retrying'
                : 'resolving',
          projection: null
        };
      });
      return;
    }

    const controller = new AbortController();
    const request: ProductProjectionRequestIdentity = {
      requestId: ++requestSequence.current,
      generation: context.generation,
      contextVersion: context.contextVersion,
      market: context.market,
      locale,
      productSlug
    };
    activeRequest.current = request;
    setState({
      status: retryNonce > 0 ? 'retrying' : 'resolving',
      projection: null
    });

    void (async () => {
      try {
        const response = await fetch(
          `/api/storefront/products/${encodeURIComponent(productSlug)}?locale=${locale}`,
          {
            cache: 'no-store',
            signal: controller.signal
          }
        );
        if (!response.ok) {
          throw new Error('product_projection_unavailable');
        }

        const payload: unknown = await response.json();
        if (!isProductProjectionResponse(payload)) {
          throw new Error('product_projection_unavailable');
        }
        const projection = payload.projection;
        if (
          projection.productId !== productId ||
          projection.slug !== productSlug ||
          projection.locale !== locale ||
          projection.market !== request.market ||
          projection.productType !== productType
        ) {
          throw new Error('product_projection_mismatch');
        }
        if (!isCurrentProductProjectionRequest(activeRequest.current, request)) {
          return;
        }

        setState({
          status: 'ready',
          projection: {
            ...projection,
            generation: request.generation,
            contextVersion: request.contextVersion
          }
        });
      } catch (error) {
        if (
          controller.signal.aborted ||
          !isCurrentProductProjectionRequest(activeRequest.current, request)
        ) {
          return;
        }
        void error;
        setState({ status: 'error', projection: null });
      }
    })();

    return () => {
      controller.abort();
      if (isCurrentProductProjectionRequest(activeRequest.current, request)) {
        activeRequest.current = null;
      }
    };
  }, [
    context.contextVersion,
    context.generation,
    context.market,
    context.pendingMarket,
    context.purchaseSafe,
    context.status,
    context.issue,
    locale,
    productId,
    productSlug,
    productType,
    retryNonce
  ]);

  if (state.status === 'resolving' || state.status === 'retrying') {
    return <ProductCommerceSkeleton locale={locale} retrying={state.status === 'retrying'} />;
  }

  if (state.status === 'error') {
    return (
      <Alert variant="destructive" className="grid min-h-[180px] content-start gap-3">
        <AlertTitle>{copy[locale].errorTitle}</AlertTitle>
        <p className="text-sm leading-relaxed">{copy[locale].errorBody}</p>
        <Button
          type="button"
          variant="secondary"
          className="min-h-11 w-fit"
          onClick={() => {
            if (context.status === 'error') {
              void context.retryContext();
              return;
            }
            setRetryNonce((value) => value + 1);
          }}
        >
          {copy[locale].retry}
        </Button>
      </Alert>
    );
  }

  if (!state.projection) {
    return <ProductCommerceSkeleton locale={locale} retrying={false} />;
  }

  const projection = state.projection;
  if (!projection.available) {
    const otherMarket = projection.otherMarket?.available ? projection.otherMarket.market : null;
    return (
      <UnavailableMarket
        market={projection.market}
        title={copy[locale].unavailableTitle}
        description={copy[locale].unavailableBody}
        switchLabel={
          otherMarket === 'vn' ? copy[locale].switchToVietnam : copy[locale].switchToInternational
        }
        pendingLabel={copy[locale].marketPending}
        failureLabel={copy[locale].marketFailure}
        retryLabel={copy[locale].retryMarket}
      />
    );
  }

  return (
    <AddToCart
      locale={locale}
      title={title}
      agreement={{
        contextStatus: context.status,
        contextMarket: context.market,
        contextGeneration: context.generation,
        contextVersion: context.contextVersion,
        locale,
        productId: projection.productId,
        offerFingerprint: projection.offerFingerprint
      }}
      projection={projection}
      variants={publicVariants(projection)}
    />
  );
}
