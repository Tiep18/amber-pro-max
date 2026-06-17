type PayPalLogLevel = 'info' | 'warn' | 'error';

type PayPalLogValue = string | number | boolean | null | undefined | PayPalLogValue[] | {[key: string]: PayPalLogValue};

export function logPayPalStage(stage: string, metadata: Record<string, PayPalLogValue> = {}, level: PayPalLogLevel = 'info') {
  const safeMetadata = Object.fromEntries(Object.entries(metadata).filter(([, value]) => value !== undefined));
  const message = `[paypal-flow] ${stage}`;
  const serializedMetadata = JSON.stringify(safeMetadata, null, 2);

  if (level === 'error') {
    console.error(message, serializedMetadata);
    return;
  }
  if (level === 'warn') {
    console.warn(message, serializedMetadata);
    return;
  }
  console.info(message, serializedMetadata);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringField(value: unknown) {
  return typeof value === 'string' ? value : undefined;
}

function amountFacts(value: unknown, prefix: 'amount' | 'gross'): Record<string, PayPalLogValue> {
  const amount = isRecord(value) ? value : null;
  return {
    [`${prefix}CurrencyCode`]: stringField(amount?.currency_code),
    [`${prefix}Value`]: stringField(amount?.value)
  };
}

function sanitizePayPalCaptureForLog(capture: unknown): Record<string, PayPalLogValue> | null {
  if (!isRecord(capture)) {
    return null;
  }

  const sellerBreakdown = isRecord(capture.seller_receivable_breakdown) ? capture.seller_receivable_breakdown : null;
  const grossAmount = isRecord(sellerBreakdown?.gross_amount) ? sellerBreakdown.gross_amount : null;
  const supplementaryData = isRecord(capture.supplementary_data) ? capture.supplementary_data : null;
  const relatedIds = isRecord(supplementaryData?.related_ids) ? supplementaryData.related_ids : null;
  const payee = isRecord(capture.payee) ? capture.payee : null;

  return {
    providerCaptureId: stringField(capture.id),
    captureStatus: stringField(capture.status),
    invoiceId: stringField(capture.invoice_id),
    customId: stringField(capture.custom_id),
    merchantId: stringField(payee?.merchant_id),
    relatedOrderId: stringField(relatedIds?.order_id),
    ...amountFacts(capture.amount, 'amount'),
    ...amountFacts(grossAmount, 'gross')
  };
}

export function sanitizePayPalProviderOrderForLog(providerOrder: unknown): Record<string, PayPalLogValue> {
  if (!isRecord(providerOrder)) {
    return {providerOrderShape: 'non_object'};
  }

  const purchaseUnits = Array.isArray(providerOrder.purchase_units) ? providerOrder.purchase_units : [];
  return {
    providerOrderId: stringField(providerOrder.id),
    providerOrderStatus: stringField(providerOrder.status),
    purchaseUnits: purchaseUnits.filter(isRecord).map((purchaseUnit) => {
      const payee = isRecord(purchaseUnit.payee) ? purchaseUnit.payee : null;
      const payments = isRecord(purchaseUnit.payments) ? purchaseUnit.payments : null;
      const captures = Array.isArray(payments?.captures) ? payments.captures : [];

      return {
        referenceId: stringField(purchaseUnit.reference_id),
        invoiceId: stringField(purchaseUnit.invoice_id),
        customId: stringField(purchaseUnit.custom_id),
        merchantId: stringField(payee?.merchant_id),
        captures: captures.map(sanitizePayPalCaptureForLog).filter((capture): capture is Record<string, PayPalLogValue> => Boolean(capture))
      };
    })
  };
}
