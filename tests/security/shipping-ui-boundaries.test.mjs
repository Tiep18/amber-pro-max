import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';

const root = new URL('../../', import.meta.url);
const read = (path) => readFile(new URL(path, root), 'utf8');

test('checkout shipping UI delegates ordering and acceptance to the shared lifecycle', async () => {
  const page = await read('src/components/checkout/checkout-page.tsx');
  assert.match(page, /beginQuoteRequest/);
  assert.match(page, /settleQuoteRequest/);
  assert.match(page, /acceptQuoteProposal/);
  assert.match(page, /canSubmitAcceptedQuote/);
  assert.doesNotMatch(page, /shippingAmountMinor|shippingProfileId|shippingRuleId/);
});

test('destination and saved-address controls do not own quote or proposal state', async () => {
  const destination = await read('src/components/checkout/destination-form.tsx');
  const saved = await read('src/components/checkout/saved-address-selector.tsx');
  assert.doesNotMatch(destination, /refreshCheckoutQuoteAction|setProposal|onAcceptedQuote/);
  assert.doesNotMatch(saved, /refreshCheckoutQuoteAction|setProposal|onAcceptedQuote/);
  assert.match(destination, /role="status"/);
  assert.match(destination, /min-h-14/);
});

test('unsupported shipping never renders a zero or free selectable method', async () => {
  const destination = await read('src/components/checkout/destination-form.tsx');
  const summary = await read('src/components/checkout/order-summary.tsx');
  assert.doesNotMatch(destination, />\s*(0|Free|Miễn phí)\s*</i);
  assert.match(summary, /if \(quote\.shipping\.status === 'unsupported_destination'\) \{\s*return t\.unsupported;/);
  assert.doesNotMatch(destination, /shipping method|phương thức giao hàng/i);
});

test('quote refresh action accepts only strict v2 cart intent', async () => {
  const action = await read('src/checkout/actions.ts');
  assert.match(action, /quoteCartInputSchema\.strict\(\)/);
  assert.doesNotMatch(action, /acceptedQuote:\s*z\.|checkoutQuoteInputSchema/);
  assert.match(action, /shippingQuoteVersion:\s*2/);
});
