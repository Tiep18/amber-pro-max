import {expect, test} from '@playwright/test';
import {rest} from './fixtures/authenticated-users';

test.describe.configure({mode: 'serial'});

const createdPostIds: string[] = [];
const createdTagIds: string[] = [];
const createdCategoryIds: string[] = [];

async function createBlogCategory(name: string) {
  const response = await rest('blog_categories', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({})
  });
  const [{id}] = (await response.json()) as Array<{id: string}>;
  createdCategoryIds.push(id);
  await rest('blog_category_translations', {
    method: 'POST',
    body: JSON.stringify([
      {category_id: id, locale: 'en', slug: `${name}-en`, name: 'Guides EN', description: ''},
      {category_id: id, locale: 'vi', slug: `${name}-vi`, name: 'Huong dan VI', description: ''}
    ])
  });
  return id;
}

async function createBlogTag(name: string) {
  const response = await rest('blog_tags', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({})
  });
  const [{id}] = (await response.json()) as Array<{id: string}>;
  createdTagIds.push(id);
  await rest('blog_tag_translations', {
    method: 'POST',
    body: JSON.stringify([
      {tag_id: id, locale: 'en', slug: `${name}-tag-en`, name: 'Care EN'},
      {tag_id: id, locale: 'vi', slug: `${name}-tag-vi`, name: 'Cham soc VI'}
    ])
  });
  return id;
}

async function createBlogPost({
  categoryId,
  tagId,
  suffix,
  status,
  publishedAt
}: {
  categoryId: string;
  tagId?: string;
  suffix: string;
  status: 'draft' | 'published';
  publishedAt: string | null;
}) {
  const response = await rest('blog_posts', {
    method: 'POST',
    headers: {Prefer: 'return=representation'},
    body: JSON.stringify({category_id: categoryId, status, published_at: publishedAt})
  });
  const [{id}] = (await response.json()) as Array<{id: string}>;
  createdPostIds.push(id);
  await rest('blog_post_translations', {
    method: 'POST',
    body: JSON.stringify([
      {
        post_id: id,
        locale: 'en',
        slug: `crochet-care-${suffix}`,
        title: `Crochet care ${suffix}`,
        description: 'Care notes for handmade crochet.',
        body: 'Keep crochet toys clean and dry.\n\nStore them away from direct sunlight.',
        social_image_bucket: 'blog-media',
        social_image_path: 'care-en.jpg'
      },
      {
        post_id: id,
        locale: 'vi',
        slug: `cham-soc-do-moc-${suffix}`,
        title: `Cham soc do moc ${suffix}`,
        description: 'Ghi chu cham soc do moc thu cong.',
        body: 'Giu thu bong moc sach va kho.\n\nBao quan tranh nang truc tiep.',
        social_image_bucket: 'blog-media',
        social_image_path: 'care-vi.jpg'
      }
    ])
  });
  if (tagId) {
    await rest('blog_post_tags', {
      method: 'POST',
      body: JSON.stringify({post_id: id, tag_id: tagId})
    });
  }
  return id;
}

test.beforeAll(async () => {
  const suffix = `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
  const [categoryId, tagId] = await Promise.all([createBlogCategory(`guides-${suffix}`), createBlogTag(`care-${suffix}`)]);
  await createBlogPost({
    categoryId,
    tagId,
    suffix,
    status: 'published',
    publishedAt: new Date(Date.now() - 60_000).toISOString()
  });
  await createBlogPost({
    categoryId,
    suffix: `draft-${suffix}`,
    status: 'draft',
    publishedAt: null
  });
  await createBlogPost({
    categoryId,
    suffix: `future-${suffix}`,
    status: 'published',
    publishedAt: new Date(Date.now() + 86_400_000).toISOString()
  });
});

test.afterAll(async () => {
  for (const postId of createdPostIds) {
    await rest(`blog_posts?id=eq.${postId}`, {method: 'DELETE'});
  }
  for (const tagId of createdTagIds) {
    await rest(`blog_tags?id=eq.${tagId}`, {method: 'DELETE'});
  }
  for (const categoryId of createdCategoryIds) {
    await rest(`blog_categories?id=eq.${categoryId}`, {method: 'DELETE'});
  }
});

test('BLOG-01 BLOG-02 D-02 D-03 public blog renders published localized posts only', async ({page}) => {
  await page.goto('/en/blog');
  await expect(page.getByRole('heading', {name: 'Amigurumi blog'})).toBeVisible();
  await expect(page.getByText(/Crochet care \d/)).toBeVisible();
  await expect(page.getByText(/draft-/)).toHaveCount(0);
  await expect(page.getByText(/future-/)).toHaveCount(0);

  const href = await page.getByRole('link', {name: /Crochet care/}).first().getAttribute('href');
  expect(href).toMatch(/^\/en\/blog\/crochet-care-/);
  await page.goto(href!);
  await expect(page.getByRole('heading', {name: /Crochet care/})).toBeVisible();
  await expect(page.getByText('Care EN')).toBeVisible();
  await expect(page.getByText('Keep crochet toys clean and dry.')).toBeVisible();
});

test('BLOG-01 D-04 Vietnamese blog alias renders localized detail', async ({page}) => {
  await page.goto('/vi/bai-viet');
  const href = await page.getByRole('link', {name: /Cham soc do moc/}).first().getAttribute('href');
  expect(href).toMatch(/^\/vi\/bai-viet\/cham-soc-do-moc-/);
  await page.goto(href!);
  await expect(page.getByRole('heading', {name: /Cham soc do moc/})).toBeVisible();
  await expect(page.getByText('Cham soc VI')).toBeVisible();
  await expect(page.getByText('Giu thu bong moc sach va kho.')).toBeVisible();
});
