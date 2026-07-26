import {
  expect,
  test as base,
  type Browser,
  type BrowserContext,
  type Page,
  type Response
} from '@playwright/test';

export const STOREFRONT_ORIGIN = 'http://localhost:3210';
export const MARKET_COOKIE = 'ACTIVE_MARKET';
export const STOREFRONT_CONTEXT_CHANNEL = 'amigurumi.storefront-context.v1';
export const STOREFRONT_CONTEXT_STORAGE_KEY = 'amigurumi.storefront-context.invalidation.v1';

export type StorefrontLocale = 'vi' | 'en';
export type StorefrontMarket = 'vn' | 'intl';

export type ContextResponse = {
  delayMs?: number;
  status?: number;
  body?: {
    market: StorefrontMarket;
    user: null;
    contextVersion: number;
  };
};

export type StorefrontSession = {
  context: BrowserContext;
  page: Page;
  locale: StorefrontLocale;
  geoCountry: string | null;
};

type RequestTracker = {
  count: () => number;
};

type StorefrontMarketHarness = {
  createSession: (options?: {
    locale?: StorefrontLocale;
    marketCookie?: string | null;
    geoCountry?: string | null;
  }) => Promise<StorefrontSession>;
  interceptContext: (page: Page, responses: ContextResponse[]) => Promise<RequestTracker>;
  interceptCatalog: (page: Page, responses: ContextResponse[]) => Promise<RequestTracker>;
  failNextServerAction: (page: Page) => Promise<void>;
  secondPage: (session: StorefrontSession) => Promise<Page>;
  focus: (page: Page) => Promise<void>;
  setVisibility: (page: Page, state: 'visible' | 'hidden') => Promise<void>;
  signalInvalidation: (page: Page, invalidationVersion: number) => Promise<void>;
  signalForgedInvalidation: (page: Page, invalidationVersion: number) => Promise<void>;
};

export const checkoutRegressionMatrix = [
  { cart: 'digital', account: 'guest', market: 'vn', payment: 'vietqr' },
  { cart: 'digital', account: 'signed-in', market: 'intl', payment: 'paypal' },
  { cart: 'physical', account: 'guest', market: 'vn', payment: 'vietqr' },
  { cart: 'physical', account: 'signed-in', market: 'intl', payment: 'paypal' },
  { cart: 'mixed', account: 'guest', market: 'vn', payment: 'vietqr' },
  { cart: 'mixed', account: 'signed-in', market: 'intl', payment: 'paypal' }
] as const;

export function catalogPath(locale: StorefrontLocale) {
  return locale === 'vi' ? '/vi/cua-hang' : '/en/catalog';
}

export async function seedMarketCookie(context: BrowserContext, value: string) {
  await context.addCookies([
    {
      name: MARKET_COOKIE,
      value,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
      secure: false
    }
  ]);
}

export async function expectMarketCookie(context: BrowserContext, expected: StorefrontMarket) {
  const cookie = (await context.cookies()).find(({ name }) => name === MARKET_COOKIE);
  expect(cookie?.value).toBe(expected);
}

export async function expectPrivateNoStore(response: Response) {
  expect(response.headers()['cache-control']).toMatch(/\bprivate\b/i);
  expect(response.headers()['cache-control']).toMatch(/\bno-store\b/i);
}

async function interceptJsonSequence(
  page: Page,
  path: RegExp,
  responses: ContextResponse[]
): Promise<RequestTracker> {
  let requests = 0;
  await page.route(path, async (route) => {
    const response = responses[Math.min(requests, responses.length - 1)];
    requests += 1;
    if (!response) {
      await route.continue();
      return;
    }
    if (response.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, response.delayMs));
    }
    await route.fulfill({
      status: response.status ?? 200,
      contentType: 'application/json',
      headers: { 'Cache-Control': 'private, no-store' },
      body: JSON.stringify(
        response.body ?? {
          market: 'intl',
          user: null,
          contextVersion: requests
        }
      )
    });
  });
  return { count: () => requests };
}

async function postInvalidation(page: Page, invalidationVersion: number, forged: boolean) {
  await page.evaluate(
    ({ channelName, storageKey, invalidationVersion: version, forged: includeForged }) => {
      const payload: Record<string, unknown> = { schemaVersion: 1, invalidationVersion: version };
      if (includeForged) {
        payload.market = 'vn';
        payload.priceMinor = 1;
        payload.quote = { hash: 'untrusted-browser-value' };
      }
      const channel = new BroadcastChannel(channelName);
      channel.postMessage(payload);
      channel.close();
      localStorage.setItem(storageKey, JSON.stringify(payload));
    },
    {
      channelName: STOREFRONT_CONTEXT_CHANNEL,
      storageKey: STOREFRONT_CONTEXT_STORAGE_KEY,
      invalidationVersion,
      forged
    }
  );
}

export const test = base.extend<{ storefrontMarket: StorefrontMarketHarness }>({
  storefrontMarket: async ({ browser }: { browser: Browser }, use) => {
    const contexts: BrowserContext[] = [];
    const createSession: StorefrontMarketHarness['createSession'] = async (options = {}) => {
      const locale = options.locale ?? 'en';
      const geoCountry = options.geoCountry ?? null;
      const context = await browser.newContext({
        locale: locale === 'vi' ? 'vi-VN' : 'en-US',
        ...(geoCountry ? { extraHTTPHeaders: { 'x-vercel-ip-country': geoCountry } } : undefined)
      });
      contexts.push(context);
      if (options.marketCookie !== undefined && options.marketCookie !== null) {
        await seedMarketCookie(context, options.marketCookie);
      }
      return { context, page: await context.newPage(), locale, geoCountry };
    };

    await use({
      createSession,
      interceptContext: (page, responses) =>
        interceptJsonSequence(page, /\/api\/storefront-context(?:\?.*)?$/, responses),
      interceptCatalog: (page, responses) =>
        interceptJsonSequence(page, /\/api\/storefront\/catalog(?:\?.*)?$/, responses),
      failNextServerAction: async (page) => {
        let failed = false;
        await page.route('**/*', async (route) => {
          if (
            failed ||
            route.request().method() !== 'POST' ||
            !route.request().headers()['next-action']
          ) {
            await route.continue();
            return;
          }

          const previousMarketCookie = (await page.context().cookies()).find(
            ({ name }) => name === MARKET_COOKIE
          );
          const response = await route.fetch();
          const body = await response.text();
          const successfulMarketResult = /\{"status":"success","market":"(?:vn|intl)"\}/;
          if (!successfulMarketResult.test(body)) {
            await route.fulfill({ response });
            return;
          }

          failed = true;
          if (previousMarketCookie) {
            await seedMarketCookie(page.context(), previousMarketCookie.value);
          } else {
            await page.context().clearCookies({ name: MARKET_COOKIE });
          }
          const headers = { ...response.headers() };
          delete headers['set-cookie'];
          delete headers['content-encoding'];
          delete headers['content-length'];
          await route.fulfill({
            response,
            headers,
            body: body.replace(
              successfulMarketResult,
              '{"status":"error","code":"mutation_failed"}'
            )
          });
        });
      },
      secondPage: (session) => session.context.newPage(),
      focus: async (page) => {
        await page.bringToFront();
        await page.evaluate(() => window.dispatchEvent(new Event('focus')));
      },
      setVisibility: async (page, state) => {
        await page.evaluate((visibilityState) => {
          Object.defineProperty(document, 'visibilityState', {
            configurable: true,
            get: () => visibilityState
          });
          document.dispatchEvent(new Event('visibilitychange'));
        }, state);
      },
      signalInvalidation: (page, version) => postInvalidation(page, version, false),
      signalForgedInvalidation: (page, version) => postInvalidation(page, version, true)
    });

    try {
      // Playwright fixtures release their resources after each test, including failed/fixme cases.
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  }
});

export { expect };
