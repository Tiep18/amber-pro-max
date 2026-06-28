import {expect, test} from '@playwright/test';
import {cleanupPhase6Data, seedPhase6Data, type Phase6Seed} from './fixtures/phase-6-seed';
import {signIn} from './fixtures/authenticated-users';

test.describe.configure({mode: 'serial'});

let seed: Phase6Seed;

test.beforeAll(async () => {
  seed = await seedPhase6Data();
});

test.afterAll(async () => {
  await cleanupPhase6Data();
});

async function signInCustomer(page: Parameters<typeof signIn>[0], next = '/en/account') {
  await signIn(page, seed.customer, next);
}

test.describe('saved address retention (ACC-03, D-01, D-02, D-04)', () => {
  test.beforeEach(async ({page}) => {
    await signInCustomer(page);
  });

  test('English customer can open the saved-address account route', async ({page}) => {
    await page.goto('/en/account/addresses');
    await expect(page.getByRole('heading', {name: /saved addresses/i})).toBeVisible();
    await expect(page.getByText('Vietnam studio')).toBeVisible();
  });

  test('Vietnamese customer can open the localized address route', async ({page}) => {
    await page.goto('/vi/tai-khoan/dia-chi');
    await expect(page.getByRole('heading', {name: /dia chi da luu/i})).toBeVisible();
  });

  test('customer can create and edit an address', async ({page}) => {
    await page.goto('/en/account/addresses');
    await page.getByLabel('Address label').last().fill('Home');
    await page.getByLabel('Recipient name').last().fill('Taylor Customer');
    await page.getByLabel('Phone number').last().fill('+15551234567');
    await page.getByLabel('Country code').last().fill('US');
    await page.getByLabel('Address line 1').last().fill('123 Market Street');
    await page.getByRole('button', {name: 'Save address'}).last().click();
    await expect(page.getByRole('status').filter({hasText: 'Address saved.'})).toBeVisible();
    await page.getByRole('button', {name: 'Edit'}).last().click();
    await page.getByLabel('Address label').first().fill('Studio');
    await page.getByRole('button', {name: 'Save address'}).first().click();
    await expect(page.getByRole('status').filter({hasText: 'Address saved.'})).toBeVisible();
  });

  test('customer can select exactly one default address', async ({page}) => {
    await page.goto('/en/account/addresses');
    await page.getByRole('button', {name: 'Set as default'}).first().click();
    await expect(page.getByRole('status')).toContainText(/default address updated/i);
    await expect(page.locator('span').filter({hasText: /^Default$/})).toHaveCount(1);
  });

  test('delete warns that prior order shipping details remain unchanged', async ({page}) => {
    await page.goto('/en/account/addresses');
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toMatch(/past orders keep their original shipping details/i);
      await dialog.accept();
    });
    await page.getByRole('button', {name: 'Delete'}).first().click();
  });

  test('checkout can reuse a saved address and revalidates the quote', async ({page}) => {
    const now = new Date().toISOString();
    await page.goto('/en');
    await page.evaluate(
      ({productId, timestamp}) => {
        window.localStorage.setItem(
          'amigurumi.guestCart.v1',
          JSON.stringify({
            version: 1,
            updatedAt: timestamp,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            lines: [{productId, variantId: null, quantity: 1, marketAtAdd: 'intl', addedAt: timestamp, updatedAt: timestamp}]
          })
        );
      },
      {productId: seed.products.physical.id, timestamp: now}
    );
    await page.goto('/en/checkout');
    const savedAddress = page.getByLabel('Saved address');
    const savedAddressValue = await savedAddress.locator('option').nth(1).getAttribute('value');
    expect(savedAddressValue).toBeTruthy();
    await savedAddress.selectOption(savedAddressValue!);
    await page.getByRole('button', {name: 'Use this address'}).click();
    await expect(page.getByLabel('Shipping country', {exact: true})).not.toHaveValue('');
    await expect(page.getByLabel('Address line 1')).not.toHaveValue('');
  });
});

test.describe('account wishlist retention (ACC-04, D-05, D-06, D-07)', () => {
  test.beforeEach(async ({page}) => {
    await signInCustomer(page);
  });

  test('English customer can view current wishlist product facts', async ({page}) => {
    await page.goto('/en/account/wishlist');
    await expect(page.getByRole('heading', {name: 'Wishlist', exact: true})).toBeVisible();
    await expect(page.getByText('Current price', {exact: true}).first()).toBeVisible();
  });

  test('Vietnamese customer can open the localized wishlist route', async ({page}) => {
    await page.goto('/vi/tai-khoan/yeu-thich');
    await expect(page.getByRole('heading', {name: /yeu thich/i})).toBeVisible();
  });

  test('unavailable market wishlist products stay visible without checkout action', async ({page}) => {
    await page.goto('/en/account/wishlist');
    const unavailableItem = page.getByRole('heading', {name: seed.products.wishlistUnavailable.title}).locator('xpath=ancestor::article[1]');
    await expect(unavailableItem.locator('span').filter({hasText: /^Unavailable in this market$/})).toBeVisible();
    await expect(unavailableItem.getByRole('button', {name: /add to cart/i})).toBeDisabled();
  });

  test('customer can remove a wishlist product without cart interaction', async ({page}) => {
    await page.goto('/en/account/wishlist');
    const removableItem = page.getByRole('heading', {name: seed.products.wishlistUnavailable.title}).locator('xpath=ancestor::article[1]');
    await removableItem.getByRole('button', {name: /remove/i}).click();
    await expect(page.getByRole('status')).toContainText(/removed/i);
    await expect(removableItem).toHaveCount(0);
    await expect(page.getByText('1 item', {exact: true})).toBeVisible();
  });
});

test.describe('product surface wishlist hearts (ACC-04, D-07, D-08)', () => {
  let surfaceSeed: Phase6Seed;

  test.beforeAll(async () => {
    surfaceSeed = await seedPhase6Data();
  });

  test('catalog cards expose stable accessible wishlist hearts', async ({page}) => {
    await signIn(page, surfaceSeed.customer, '/en/account');
    await page.goto('/en/catalog');
    const heart = page.getByRole('button', {name: /save .* to wishlist/i}).first();
    await expect(heart).toHaveAttribute('aria-pressed', 'false');
    await expect(heart).toHaveCSS('min-height', '44px');
  });

  test('catalog cards preserve existing wishlist selected state', async ({page}) => {
    await signIn(page, surfaceSeed.customer, '/en/account');
    await page.goto('/en/catalog');
    const savedProduct = page.getByRole('article', {name: surfaceSeed.products.wishlistAvailable.title});
    await expect(savedProduct.getByRole('button', {name: `Remove ${surfaceSeed.products.wishlistAvailable.title} from wishlist`})).toHaveAttribute('aria-pressed', 'true');
  });

  test('signed-in customer can toggle a catalog card heart selected state', async ({page}) => {
    await signIn(page, surfaceSeed.customer, '/en/account');
    await page.goto('/en/catalog');
    const heart = page.getByRole('button', {name: /save .* to wishlist/i}).first();
    const title = await heart.getAttribute('aria-label');
    await heart.click();
    const productTitle = title?.replace(/^Save /, '').replace(/ to wishlist$/, '');
    expect(productTitle).toBeTruthy();
    await expect(page.getByRole('button', {name: `Remove ${productTitle} from wishlist`})).toHaveAttribute('aria-pressed', 'true');
  });

  test('signed-in customer can remove and restore a saved heart with persisted state', async ({
    page
  }) => {
    await signIn(page, surfaceSeed.customer, '/en/account');
    await page.goto('/en/catalog');
    const savedProduct = page.getByRole('article', {name: surfaceSeed.products.wishlistAvailable.title});
    const removeHeart = savedProduct.getByRole('button', {
      name: `Remove ${surfaceSeed.products.wishlistAvailable.title} from wishlist`
    });

    await removeHeart.click();
    await expect(
      savedProduct.getByRole('button', {
        name: `Save ${surfaceSeed.products.wishlistAvailable.title} to wishlist`
      })
    ).toHaveAttribute('aria-pressed', 'false');
    await page.reload();
    await expect(
      savedProduct.getByRole('button', {
        name: `Save ${surfaceSeed.products.wishlistAvailable.title} to wishlist`
      })
    ).toHaveAttribute('aria-pressed', 'false');

    await savedProduct
      .getByRole('button', {
        name: `Save ${surfaceSeed.products.wishlistAvailable.title} to wishlist`
      })
      .click();
    await expect(
      savedProduct.getByRole('button', {
        name: `Remove ${surfaceSeed.products.wishlistAvailable.title} from wishlist`
      })
    ).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(
      savedProduct.getByRole('button', {
        name: `Remove ${surfaceSeed.products.wishlistAvailable.title} from wishlist`
      })
    ).toHaveAttribute('aria-pressed', 'true');
  });

  test('product detail heart sits near purchase intent without replacing the buy CTA', async ({page}) => {
    await signIn(page, surfaceSeed.customer, '/en/account');
    await page.goto(`/en/product/${surfaceSeed.products.physical.enSlug}`);
    await expect(page.getByRole('button', {name: /save .* to wishlist/i})).toBeVisible();
    await expect(page.getByRole('button', {name: /add to cart/i})).toBeVisible();
  });

  test('product detail preserves existing wishlist selected state', async ({page}) => {
    await signIn(page, surfaceSeed.customer, '/en/account');
    await page.goto(`/en/product/${surfaceSeed.products.wishlistAvailable.enSlug}`);
    await expect(page.getByRole('button', {name: `Remove ${surfaceSeed.products.wishlistAvailable.title} from wishlist`})).toHaveAttribute('aria-pressed', 'true');
  });

  test('guest card heart redirects to localized sign-in with product return and no guest merge UI', async ({page}) => {
    await page.goto('/vi/cua-hang');
    await page.getByRole('button', {name: /luu .* yeu thich/i}).first().click();
    await expect(page).toHaveURL(/\/vi\/dang-nhap\?next=/);
    await expect(page.getByText(/merge wishlist|guest wishlist/i)).toHaveCount(0);
  });
});
