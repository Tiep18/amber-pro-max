import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

describe('admin order detail revalidation', () => {
  test.each([
    'src/payments/admin-actions.ts',
    'src/fulfillment/physical.ts',
    'src/fulfillment/admin-entitlement-actions.ts'
  ])('%s keeps list and exact order-number paths fresh', (sourcePath) => {
    const source = readFileSync(sourcePath, 'utf8');

    expect(source).toContain("revalidatePath('/admin/orders')");
    expect(source).toContain('/admin/orders/${encodeURIComponent(');
  });

  test('admin email recovery invalidates the order list and dynamic detail route without trusting an order number', () => {
    const source = readFileSync('src/fulfillment/admin-email-actions.ts', 'utf8');

    expect(source).toContain("revalidatePath('/admin/orders')");
    expect(source).toContain("revalidatePath('/admin/orders/[orderNumber]', 'page')");
    expect(source).not.toContain("orderNumber: getFormString(formData, 'orderNumber')");
  });

  test('entitlement forms submit the public order number, never substitute the database id', () => {
    const control = readFileSync(
      'src/components/admin/fulfillment/entitlement-action-control.tsx',
      'utf8'
    );
    const action = readFileSync('src/fulfillment/admin-entitlement-actions.ts', 'utf8');

    expect(control).toContain('name="orderNumber"');
    expect(action).toContain("orderNumber: getFormString(formData, 'orderNumber')");
    expect(action).not.toContain('revalidatePath(`/admin/orders/${orderId}`)');
  });
});
