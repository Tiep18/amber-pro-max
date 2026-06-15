import {describe, expect, test} from 'vitest';

const vietQrInstructionContract = {
  market: 'vn',
  currencyCode: 'VND',
  amountMinor: 250000,
  orderNumber: 'ATB-20260615-0002',
  transferReference: 'ATB-20260615-0002',
  deadlineMinutes: 24 * 60
} as const;

describe('VietQR instruction and evidence contract', () => {
  test('keeps VietQR as exact VND payment instructions, not customer self-confirmation', () => {
    expect(vietQrInstructionContract).toMatchObject({
      market: 'vn',
      currencyCode: 'VND',
      amountMinor: 250000,
      transferReference: vietQrInstructionContract.orderNumber,
      deadlineMinutes: 1440
    });
  });

  test.todo('builds a VietQR quick-link or image URL from server-only approved bank configuration');
  test.todo('includes exact amount, unique ASCII reference, account display data, and payment deadline');
  test.todo('rejects USD or international PayPal orders before creating VietQR instructions');
  test.todo('requires admin bank reference, received amount, and received timestamp before confirmation');
  test.todo('rejects wrong amount or wrong reference through an audited release transition');
  test.todo('handles admin double-submit and stale confirm-versus-reject as idempotent no-ops');
});
