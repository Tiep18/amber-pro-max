import {expect, test} from '@playwright/test';
import type {Page} from '@playwright/test';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:55431';
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';
const serviceHeaders = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json'
};

test.describe.configure({mode: 'serial'});

const createdUserIds: string[] = [];
const createdProductIds: string[] = [];
const createdTaxonomy: Array<{table: string; id: string}> = [];

async function rest(path: string, init?: RequestInit) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {...serviceHeaders, ...init?.headers}
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

async function createConfirmedUser(role?: 'admin') {
  const email = `catalog-${role ?? 'customer'}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
  const password = 'secure-password-123';
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: serviceHeaders,
    body: JSON.stringify({email, password, email_confirm: true})
  });
  if (!response.ok) {
    throw new Error(`User creation failed: ${response.status} ${await response.text()}`);
  }

  const user = (await response.json()) as {id: string};
  createdUserIds.push(user.id);
  if (role === 'admin') {
    await rest('user_roles', {
      method: 'POST',
      headers: {Prefer: 'resolution=merge-duplicates'},
      body: JSON.stringify({user_id: user.id, role: 'admin', note: 'E2E catalog admin'})
    });
  }
  return {email, password};
}

async function createTaxonomyFixture(
  table: 'categories' | 'techniques' | 'tags' | 'collections',
  translationsTable: 'category_translations' | 'technique_translations' | 'tag_translations' | 'collection_translations',
  foreignKey: 'category_id' | 'technique_id' | 'tag_id' | 'collection_id',
  name: string
) {
  const response = await rest(table, {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({})
  });
  const [{id}] = (await response.json()) as Array<{id: string}>;
  createdTaxonomy.push({table, id});

  const localized = ['vi', 'en'].map((locale) => ({
    [foreignKey]: id,
    locale,
    name: `${name} ${locale.toUpperCase()}`,
    ...(table === 'categories' || table === 'collections'
      ? {
          slug: `${name.toLowerCase().replaceAll(' ', '-')}-${locale}`,
          description: ''
        }
      : {})
  }));
  await rest(translationsTable, {
    method: 'POST',
    body: JSON.stringify(localized)
  });

  return {id, label: `${name} EN`};
}

async function signIn(page: Page, user: {email: string; password: string}, expected: 'admin' | 'forbidden') {
  await page.goto('/en/sign-in?next=/admin/catalog');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', {name: 'Sign in'}).click();
  if (expected === 'admin') {
    await expect(page).toHaveURL((url) => url.pathname === '/admin/catalog');
    await expect(page.getByRole('heading', {name: 'Products', exact: true})).toBeVisible();
  } else {
    await expect(page).toHaveURL((url) => url.pathname === '/admin/forbidden');
    await expect(page.getByRole('heading', {name: 'Access denied'})).toBeVisible();
  }
}

async function selectProductType(page: Page, option: 'PDF pattern' | 'Physical finished good') {
  await page.getByLabel('Product type').click();
  await page.getByRole('option', {name: option, exact: true}).click();
}

async function selectLocale(page: Page, panel: 'content' | 'seo', locale: 'Vietnamese' | 'English') {
  const panelIndex = panel === 'content' ? 0 : 1;
  await page
    .getByRole('tablist', {name: 'Content language'})
    .nth(panelIndex)
    .getByRole('tab', {name: locale})
    .click();
}

function productForm(page: Page) {
  return page.locator('form[data-scrollspy-state]');
}

function visibleSectionNavigation(page: Page) {
  return page.locator('nav[aria-label="Product form sections"]:visible');
}

async function waitForScrollspyIdle(page: Page) {
  await expect(productForm(page)).toHaveAttribute('data-scrollspy-state', 'idle');
}

async function positionSectionAtActivationLine(page: Page, sectionId: string) {
  await page.evaluate(async (id) => {
    const form = document.querySelector<HTMLElement>('form[data-scrollspy-state]');
    const section = document.getElementById(id);
    if (!form || !section) throw new Error(`Missing scrollspy geometry for ${id}`);
    const targetOffset = Number(form.dataset.scrollspyTargetOffset);
    const activationBounds = Number(form.dataset.scrollspyActivationBounds);
    const absoluteSectionTop = window.scrollY + section.getBoundingClientRect().top;
    const previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo({
      top: absoluteSectionTop - targetOffset - activationBounds,
      behavior: 'auto'
    });
    document.documentElement.style.scrollBehavior = previousBehavior;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }, sectionId);
}

test.afterAll(async () => {
  for (const productId of createdProductIds) {
    await rest(`products?id=eq.${productId}`, {method: 'DELETE'});
  }
  for (const item of createdTaxonomy.reverse()) {
    await rest(`${item.table}?id=eq.${item.id}`, {method: 'DELETE'});
  }
  for (const userId of createdUserIds) {
    const response = await fetch(`${supabaseUrl}/auth/v1/admin/users/${userId}`, {
      method: 'DELETE',
      headers: serviceHeaders
    });
    if (!response.ok) {
      throw new Error(`User cleanup failed: ${response.status} ${await response.text()}`);
    }
  }
});

test('admin persists an incomplete draft and publish saves the current editor snapshot', async ({page}) => {
  const slugSuffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const partialVietnameseTitle = `Mau tho dang do ${slugSuffix}`;
  const unsavedEnglishTitle = `Publish snapshot bunny ${slugSuffix}`;
  const [category, technique, tag, collection] = await Promise.all([
    createTaxonomyFixture('categories', 'category_translations', 'category_id', 'Animals'),
    createTaxonomyFixture('techniques', 'technique_translations', 'technique_id', 'Amigurumi'),
    createTaxonomyFixture('tags', 'tag_translations', 'tag_id', 'Beginner'),
    createTaxonomyFixture('collections', 'collection_translations', 'collection_id', 'Spring')
  ]);
  const occupiedProductResponse = await rest('products', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({product_type: 'physical_finished'})
  });
  const [{id: occupiedProductId}] = (await occupiedProductResponse.json()) as Array<{id: string}>;
  createdProductIds.push(occupiedProductId);
  await rest('collection_products', {
    method: 'POST',
    body: JSON.stringify({
      collection_id: collection.id,
      product_id: occupiedProductId,
      display_order: 7
    })
  });
  const admin = await createConfirmedUser('admin');
  await signIn(page, admin, 'admin');

  await page.goto('/admin/catalog/new');
  await expect(page.getByRole('heading', {name: 'New product'})).toBeVisible();
  await selectProductType(page, 'PDF pattern');

  await page.getByLabel('Vietnamese title').fill(partialVietnameseTitle);
  await page.getByLabel('Vietnamese description').fill('Ban nhap dang viet do.');
  await page.getByLabel('Vietnamese specifications JSON').fill('{"difficulty":"easy"}');
  await page.getByRole('button', {name: 'Vietnam market enabled'}).click();
  await page.getByRole('button', {name: 'Save draft', exact: true}).first().click();

  await expect(page).toHaveURL(/\/admin\/catalog\/[0-9a-f-]+(?:\?saved=1)?$/);
  const productId = new URL(page.url()).pathname.split('/').at(-1);
  expect(productId).toBeTruthy();
  createdProductIds.push(productId!);
  await expect(page.getByText('Draft saved')).toBeVisible();

  await page.reload();
  await expect(page.getByLabel('Vietnamese title')).toHaveValue(partialVietnameseTitle);
  await expect(page.getByLabel('Vietnamese description')).toHaveValue('Ban nhap dang viet do.');
  await expect(page.getByRole('button', {name: 'Vietnam market enabled'})).toHaveAttribute(
    'data-state',
    'on'
  );
  await expect(page.getByLabel('Vietnam price in VND')).toHaveValue('');
  await expect(page.getByText('Current status: draft')).toBeVisible();

  await selectLocale(page, 'content', 'English');
  await page.getByLabel('English title').fill(unsavedEnglishTitle);
  await page.getByLabel('English description').fill('Current snapshot saved by publish.');
  await page.getByLabel('English specifications JSON').fill('{"difficulty":"easy"}');

  await page.getByRole('button', {name: category.label, exact: true}).click();
  await page.getByRole('button', {name: technique.label, exact: true}).click();
  await page.getByRole('button', {name: tag.label, exact: true}).click();
  await page.getByRole('button', {name: collection.label, exact: true}).click();
  await expect(page.getByLabel(`${collection.label} display order`)).toHaveValue('8');

  await page.getByLabel('Vietnam price in VND').fill('173000');

  await selectLocale(page, 'seo', 'Vietnamese');
  await page.getByLabel('Vietnamese slug').fill(`mau-tho-mua-xuan-${slugSuffix}`);
  await page.getByLabel('Vietnamese SEO title').fill('Mau tho mua xuan');
  await page.getByLabel('Vietnamese SEO description').fill('Tai mau moc tho mua xuan.');
  await selectLocale(page, 'seo', 'English');
  await page.getByLabel('English slug').fill(`publish-snapshot-bunny-${slugSuffix}`);
  await page.getByLabel('English SEO title').fill('Publish snapshot bunny');
  await page.getByLabel('English SEO description').fill('Download the spring bunny crochet pattern.');

  await page.getByRole('button', {name: 'Publish product'}).click();
  await expect(page.getByRole('heading', {name: 'Publishing blocked'})).toBeVisible();
  await expect(page.locator('#publish-heading')).toBeFocused();
  await expect(page.getByText('Primary product image')).toBeVisible();
  await expect(page.getByText('Vietnamese social image')).toBeVisible();
  await expect(page.getByText('English social image')).toBeVisible();
  await expect(page.getByText('Private PDF')).toBeVisible();

  const membershipsResponse = await rest(
    `collection_products?collection_id=eq.${collection.id}&select=product_id,display_order&order=display_order`
  );
  expect(await membershipsResponse.json()).toEqual([
    {product_id: occupiedProductId, display_order: 7},
    {product_id: productId, display_order: 8}
  ]);

  await expect(page.getByRole('link', {name: 'Manage media and PDF'})).toHaveAttribute(
    'href',
    `/admin/catalog/${productId}/media`
  );
  await expect(page.getByRole('link', {name: 'Manage variants and inventory'})).toHaveAttribute(
    'href',
    `/admin/catalog/${productId}/variants`
  );

  await page.reload();
  await selectLocale(page, 'content', 'English');
  await expect(page.getByLabel('English title')).toHaveValue(unsavedEnglishTitle);
  await expect(page.getByLabel('Vietnam price in VND')).toHaveValue('173000');
  await expect(page.getByText('Current status: draft')).toBeVisible();

  await page.goto('/admin/catalog');
  const productRow = page.getByRole('row').filter({hasText: unsavedEnglishTitle});
  await expect(productRow).toBeVisible();
  await expect(productRow.getByText('draft', {exact: true})).toBeVisible();
});

test('product editor scrollspy resolves, cancels, measures sticky controls, and respects reduced motion', async ({
  page
}) => {
  test.setTimeout(60_000);
  const admin = await createConfirmedUser('admin');
  await signIn(page, admin, 'admin');
  await page.setViewportSize({width: 1280, height: 900});
  await page.goto('/admin/catalog/new');
  await expect(page.getByRole('heading', {name: 'New product'})).toBeVisible();

  const form = productForm(page);
  await expect
    .poll(async () => Number(await form.getAttribute('data-scrollspy-target-offset')))
    .toBeGreaterThan(0);

  await visibleSectionNavigation(page)
    .getByRole('button', {name: /Content/})
    .click();
  await expect(
    visibleSectionNavigation(page).getByRole('button', {name: /Content/})
  ).toHaveAttribute('aria-current', 'step');
  await waitForScrollspyIdle(page);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const formElement = document.querySelector<HTMLElement>('form[data-scrollspy-state]');
        const heading = document.getElementById('content-heading');
        if (!formElement || !heading) return Number.POSITIVE_INFINITY;
        return Math.abs(
          heading.closest('section')!.getBoundingClientRect().top -
            Number(formElement.dataset.scrollspyTargetOffset)
        );
      })
    )
    .toBeLessThan(3);

  await positionSectionAtActivationLine(page, 'pricing');
  await expect(
    page.locator('nav[aria-label="Product form sections"] [aria-current="step"]')
  ).toHaveCount(1);
  await expect(
    page.locator('nav[aria-label="Product form sections"] [aria-current="step"]')
  ).toContainText('Market offers');
  await positionSectionAtActivationLine(page, 'content');
  await expect(
    page.locator('nav[aria-label="Product form sections"] [aria-current="step"]')
  ).toContainText('Content');

  await page.evaluate(async () => {
    const previousBehavior = document.documentElement.style.scrollBehavior;
    document.documentElement.style.scrollBehavior = 'auto';
    window.scrollTo({top: document.documentElement.scrollHeight, behavior: 'auto'});
    document.documentElement.style.scrollBehavior = previousBehavior;
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  });
  await expect(
    page.locator('nav[aria-label="Product form sections"] [aria-current="step"]')
  ).toContainText('Readiness');

  const desktopNavigation = visibleSectionNavigation(page);
  await desktopNavigation.getByRole('button', {name: /Product details/}).click();
  await desktopNavigation.getByRole('button', {name: /Search and SEO/}).click();
  await waitForScrollspyIdle(page);
  await expect(desktopNavigation.getByRole('button', {name: /Search and SEO/})).toHaveAttribute(
    'aria-current',
    'step'
  );

  await desktopNavigation.getByRole('button', {name: /Product details/}).click();
  await waitForScrollspyIdle(page);
  await desktopNavigation.getByRole('button', {name: /Readiness/}).click();
  await expect(form).toHaveAttribute('data-scrollspy-state', 'animating');
  await page.mouse.wheel(0, 40);
  await positionSectionAtActivationLine(page, 'content');
  await expect(form).toHaveAttribute('data-scrollspy-state', 'idle');
  await expect(desktopNavigation.getByRole('button', {name: /Content/})).toHaveAttribute(
    'aria-current',
    'step'
  );

  const desktopOffset = Number(await form.getAttribute('data-scrollspy-target-offset'));
  await page.setViewportSize({width: 375, height: 800});
  await expect
    .poll(async () => Number(await form.getAttribute('data-scrollspy-target-offset')))
    .toBeGreaterThan(desktopOffset);
  await page.getByRole('button', {name: 'Open section navigator'}).click();
  await page
    .getByRole('dialog')
    .getByRole('button', {name: /Market offers/})
    .click();
  await waitForScrollspyIdle(page);
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const formElement = document.querySelector<HTMLElement>('form[data-scrollspy-state]');
        const section = document.getElementById('pricing');
        if (!formElement || !section) return Number.POSITIVE_INFINITY;
        return Math.abs(
          section.getBoundingClientRect().top - Number(formElement.dataset.scrollspyTargetOffset)
        );
      })
    )
    .toBeLessThan(3);

  await page.setViewportSize({width: 1280, height: 900});
  await page.emulateMedia({reducedMotion: 'reduce'});
  await expect
    .poll(() => page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches))
    .toBe(true);
  await waitForScrollspyIdle(page);
  const immediateNavigation = await page.evaluate(() => {
    const formElement = document.querySelector<HTMLElement>('form[data-scrollspy-state]');
    const section = document.getElementById('content');
    const navigation = Array.from(
      document.querySelectorAll<HTMLElement>('nav[aria-label="Product form sections"]')
    ).find((element) => element.offsetParent !== null);
    const button = Array.from(navigation?.querySelectorAll<HTMLButtonElement>('button') ?? []).find(
      (element) => element.textContent?.includes('Content')
    );
    if (!formElement || !section || !button) throw new Error('Missing reduced-motion target');
    const offset = Number(formElement.dataset.scrollspyTargetOffset);
    const expected = Math.min(
      document.documentElement.scrollHeight - window.innerHeight,
      Math.max(0, window.scrollY + section.getBoundingClientRect().top - offset)
    );
    button.click();
    return {
      actual: window.scrollY,
      expected,
      state: formElement.dataset.scrollspyState
    };
  });
  expect(immediateNavigation.state).toBe('idle');
  expect(Math.abs(immediateNavigation.actual - immediateNavigation.expected)).toBeLessThan(3);

  await selectLocale(page, 'content', 'English');
  await page.getByLabel('English specifications JSON').fill('not-json');
  await selectLocale(page, 'content', 'Vietnamese');
  await page.getByRole('button', {name: 'Save draft', exact: true}).first().click();
  await expect(
    page
      .getByRole('tablist', {name: 'Content language'})
      .first()
      .getByRole('tab', {name: 'English'})
  ).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('English specifications JSON')).toHaveAttribute(
    'aria-invalid',
    'true'
  );
  await expect(page.getByLabel('English specifications JSON')).toBeFocused();
  await expect(
    page.getByText('Enter valid JSON, for example {"skillLevel":"easy"}.')
  ).toBeVisible();
});

test('customer cannot access the product editor', async ({page}) => {
  const customer = await createConfirmedUser();
  await signIn(page, customer, 'forbidden');

  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  await page.goto('/admin/catalog/new');
  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  await expect(page.getByRole('heading', {name: 'New product'})).toHaveCount(0);
});
