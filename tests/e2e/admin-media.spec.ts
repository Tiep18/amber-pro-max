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
const createdObjects: Array<{bucket: 'product-media' | 'pattern-pdfs'; path: string}> = [];

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
  const email = `media-${role ?? 'customer'}-${Date.now()}-${Math.random().toString(16).slice(2)}@example.com`;
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
      body: JSON.stringify({user_id: user.id, role: 'admin', note: 'E2E media admin'})
    });
  }
  return {email, password};
}

async function createPdfProduct() {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const productResponse = await rest('products', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({product_type: 'pdf_pattern'})
  });
  const [{id}] = (await productResponse.json()) as Array<{id: string}>;
  createdProductIds.push(id);

  await rest('product_translations', {
    method: 'POST',
    body: JSON.stringify([
      {
        product_id: id,
        locale: 'vi',
        title: 'Mau tho co kinh',
        description: 'Huong dan moc tho co kinh.',
        specifications: {difficulty: 'easy'},
        slug: `mau-tho-co-kinh-${suffix}`,
        seo_title: 'Mau tho co kinh',
        seo_description: 'Tai mau moc tho co kinh.'
      },
      {
        product_id: id,
        locale: 'en',
        title: 'Classic bunny pattern',
        description: 'Crochet a classic bunny.',
        specifications: {difficulty: 'easy'},
        slug: `classic-bunny-pattern-${suffix}`,
        seo_title: 'Classic bunny pattern',
        seo_description: 'Download the classic bunny crochet pattern.'
      }
    ])
  });

  await rest('product_market_offers', {
    method: 'POST',
    body: JSON.stringify([
      {product_id: id, market_code: 'vn', currency_code: 'VND', enabled: true, price_minor: 125000},
      {product_id: id, market_code: 'intl', currency_code: 'USD', enabled: true, price_minor: 700}
    ])
  });

  return id;
}

async function signIn(page: Page, user: {email: string; password: string}) {
  await page.goto('/en/sign-in?next=/admin/catalog');
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  await page.getByRole('button', {name: 'Sign in'}).click();
}

async function fetchDigitalAsset(productId: string) {
  const response = await rest(
    `product_digital_assets?product_id=eq.${productId}&select=bucket_id,object_path,file_name,content_type,byte_size,checksum_sha256`
  );
  const rows = (await response.json()) as Array<{
    bucket_id: 'pattern-pdfs';
    object_path: string;
    file_name: string;
    content_type: string;
    byte_size: number;
    checksum_sha256: string | null;
  }>;
  return rows[0];
}

async function fetchMedia(productId: string) {
  const response = await rest(`product_media?product_id=eq.${productId}&select=bucket_id,object_path,is_primary`);
  const rows = (await response.json()) as Array<{
    bucket_id: 'product-media';
    object_path: string;
    is_primary: boolean;
  }>;
  return rows;
}

test.afterAll(async () => {
  for (const object of createdObjects.reverse()) {
    await fetch(`${supabaseUrl}/storage/v1/object/${object.bucket}/${object.path}`, {
      method: 'DELETE',
      headers: serviceHeaders
    });
  }
  for (const productId of createdProductIds) {
    await rest(`products?id=eq.${productId}`, {method: 'DELETE'});
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

test('admin uploads product images, selects social images, uploads a private PDF, and publishes', async ({page}) => {
  const productId = await createPdfProduct();
  const admin = await createConfirmedUser('admin');

  await signIn(page, admin);
  await expect(page).toHaveURL(/\/admin\/catalog$/);
  await expect(page.getByRole('heading', {name: 'Products', exact: true})).toBeVisible();
  await page.goto(`/admin/catalog/${productId}/media`);
  await expect(page).toHaveURL(new RegExp(`/admin/catalog/${productId}/media$`));
  await expect(page.getByRole('heading', {name: 'Media and private PDF'})).toBeVisible();

  await page.getByLabel('Product image file').setInputFiles({
    name: 'bunny.png',
    mimeType: 'image/png',
    buffer: Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=',
      'base64'
    )
  });
  await page.getByLabel('Vietnamese image alt text').fill('Tho len mau xanh');
  await page.getByLabel('English image alt text').fill('Blue crochet bunny');
  await page.getByRole('button', {name: 'Upload image'}).click();
  await expect(page.getByText('Image uploaded')).toBeVisible({timeout: 15_000});

  await page.getByRole('button', {name: 'Set primary image'}).click();
  await expect(page.getByText('Primary image selected')).toBeVisible();
  await page.getByRole('button', {name: 'Use for Vietnamese social image'}).click();
  await expect(page.getByText('Vietnamese social image selected')).toBeVisible();
  await page.getByRole('button', {name: 'Use for English social image'}).click();
  await expect(page.getByText('English social image selected')).toBeVisible();

  await page.getByLabel('Pattern PDF file').setInputFiles({
    name: 'classic-bunny.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF')
  });
  await page.getByRole('button', {name: 'Upload private PDF'}).click();
  await expect(page.getByText('Private PDF associated')).toBeVisible({timeout: 15_000});
  await expect(page.getByText('classic-bunny.pdf')).toBeVisible();
  await expect(page.locator('a[href*="pattern-pdfs"]')).toHaveCount(0);

  const [media] = await fetchMedia(productId);
  expect(media.bucket_id).toBe('product-media');
  expect(media.is_primary).toBe(true);
  createdObjects.push({bucket: 'product-media', path: media.object_path});

  const asset = await fetchDigitalAsset(productId);
  expect(asset.bucket_id).toBe('pattern-pdfs');
  expect(asset.content_type).toBe('application/pdf');
  expect(asset.checksum_sha256).toMatch(/^[a-f0-9]{64}$/);
  createdObjects.push({bucket: 'pattern-pdfs', path: asset.object_path});

  const publicPdfResponse = await page.request.get(`${supabaseUrl}/storage/v1/object/pattern-pdfs/${asset.object_path}`);
  expect(publicPdfResponse.ok()).toBe(false);

  await page.goto(`/admin/catalog/${productId}`);
  await page.getByRole('button', {name: 'Publish product'}).click();
  await expect(page.getByText('Product published')).toBeVisible();
});

test('customer cannot open the media admin page', async ({page}) => {
  const productId = await createPdfProduct();
  const customer = await createConfirmedUser();

  await signIn(page, customer);
  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  await page.goto(`/admin/catalog/${productId}/media`);
  await expect(page).toHaveURL(/\/admin\/forbidden$/);
  await expect(page.getByRole('heading', {name: 'Media and private PDF'})).toHaveCount(0);
});
