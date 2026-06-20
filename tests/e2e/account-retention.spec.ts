import {expect, test} from '@playwright/test';

// Plan 06-10 activates these contracts with authenticated customer fixtures.
test.describe.skip('saved address retention (ACC-03, D-01, D-02, D-04)', () => {
  test('English customer can open the saved-address account route', async ({page}) => {
    await page.goto('/en/account/addresses');
    await expect(page.getByRole('heading', {name: /saved addresses/i})).toBeVisible();
  });

  test('Vietnamese customer can open the localized address route', async ({page}) => {
    await page.goto('/vi/tai-khoan/dia-chi');
    await expect(page.getByRole('heading', {name: /dia chi da luu/i})).toBeVisible();
  });

  test('customer can create and edit an address', async ({page}) => {
    await page.goto('/en/account/addresses');
    await page.getByLabel('Address label').fill('Home');
    await page.getByLabel('Recipient name').fill('Taylor Customer');
    await page.getByLabel('Phone number').fill('+15551234567');
    await page.getByLabel('Country code').fill('US');
    await page.getByLabel('Address line 1').fill('123 Market Street');
    await page.getByRole('button', {name: 'Save address'}).click();
    await page.getByRole('button', {name: 'Edit'}).click();
    await page.getByLabel('Address label').fill('Studio');
    await page.getByRole('button', {name: 'Save address'}).click();
    await expect(page.getByText('Studio')).toBeVisible();
  });

  test('customer can select exactly one default address', async ({page}) => {
    await page.goto('/en/account/addresses');
    await page.getByRole('button', {name: 'Set as default'}).last().click();
    await expect(page.getByText('Default')).toHaveCount(1);
  });

  test('delete warns that prior order shipping details remain unchanged', async ({page}) => {
    await page.goto('/en/account/addresses');
    page.once('dialog', async (dialog) => {
      expect(dialog.message()).toMatch(/past orders keep their original shipping details/i);
      await dialog.accept();
    });
    await page.getByRole('button', {name: 'Delete'}).first().click();
  });

  test('checkout can reuse a saved address and shows material quote changes before accepting', async ({page}) => {
    await page.goto('/en/checkout');
    await page.getByLabel('Saved address').selectOption({label: 'Vietnam studio - 2 Nguyen Hue, VN'});
    await page.getByRole('button', {name: 'Use this address'}).click();
    await expect(page.getByLabel('Country code')).toHaveValue('VN');
    await expect(page.getByRole('dialog', {name: /quote changed/i})).toBeVisible();
  });
});
