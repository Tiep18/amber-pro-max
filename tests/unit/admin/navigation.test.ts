import { describe, expect, it } from 'vitest';
import { selectActiveAdminHref } from '@/admin/navigation';

const hrefs = [
  '/admin',
  '/admin/orders',
  '/admin/catalog',
  '/admin/catalog/taxonomy',
  '/admin/blog',
  '/admin/blog/taxonomy'
];

describe('selectActiveAdminHref', () => {
  it('only activates the dashboard on the admin root', () => {
    expect(selectActiveAdminHref('/admin', hrefs)).toBe('/admin');
    expect(selectActiveAdminHref('/admin/orders', hrefs)).toBe('/admin/orders');
  });

  it('keeps product workflows under Catalog', () => {
    expect(selectActiveAdminHref('/admin/catalog/product-id/media', hrefs)).toBe('/admin/catalog');
  });

  it('prefers the most specific taxonomy route', () => {
    expect(selectActiveAdminHref('/admin/catalog/taxonomy', hrefs)).toBe('/admin/catalog/taxonomy');
    expect(selectActiveAdminHref('/admin/blog/taxonomy', hrefs)).toBe('/admin/blog/taxonomy');
  });
});
