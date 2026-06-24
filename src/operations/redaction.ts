export type OperationalErrorArea = 'application' | 'payment' | 'email' | 'fulfillment' | 'checkout' | 'admin';
export type OperationalErrorSeverity = 'warning' | 'error' | 'critical';
export type SafeOperationalFact = string | number | boolean | null | SafeOperationalFact[] | {[key: string]: SafeOperationalFact};

export type SanitizedOperationalErrorInput = {
  area: OperationalErrorArea;
  severity: OperationalErrorSeverity;
  errorCode: string;
  summary: string;
  facts: Record<string, SafeOperationalFact>;
};

const allowedAreas = new Set<OperationalErrorArea>(['application', 'payment', 'email', 'fulfillment', 'checkout', 'admin']);
const allowedSeverities = new Set<OperationalErrorSeverity>(['warning', 'error', 'critical']);
const allowedFactKeys = new Set([
  'amountCurrency',
  'amountValue',
  'area',
  'attempt',
  'captureStatus',
  'code',
  'currency',
  'emailType',
  'errorCode',
  'eventType',
  'fulfillmentStatus',
  'httpStatus',
  'invoiceId',
  'lastStatus',
  'market',
  'orderId',
  'orderNumber',
  'paymentId',
  'paymentStatus',
  'phase',
  'provider',
  'providerCaptureId',
  'providerEventId',
  'providerOrderId',
  'queueName',
  'referenceId',
  'requestId',
  'reservationStatus',
  'retryCount',
  'source',
  'status',
  'timestamp',
  'transition'
]);

const unsafeKeyPattern = /authorization|bearer|cookie|password|secret|signature|token|signed[_-]?url|raw[_-]?payload|payload|stack|trace|email|address|phone/i;
const emailPattern = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const jwtPattern = /eyj[a-z0-9_-]{10,}/i;
const bearerPattern = /bearer\s+[a-z0-9._-]+/i;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function safeString(value: string) {
  const trimmed = value.trim();
  if (!trimmed || unsafeValue(trimmed)) {
    return null;
  }
  return trimmed.slice(0, 200);
}

function unsafeValue(value: string) {
  return emailPattern.test(value) || jwtPattern.test(value) || bearerPattern.test(value) || /https?:\/\/\S*(token|signature|expires|download)\S*/i.test(value);
}

function sanitizeFactValue(value: unknown, depth = 0): SafeOperationalFact | undefined {
  if (depth > 3 || value === undefined) {
    return undefined;
  }
  if (value === null || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value === 'string') {
    return safeString(value) ?? undefined;
  }
  if (Array.isArray(value)) {
    const items = value
      .map((item) => sanitizeFactValue(item, depth + 1))
      .filter((item): item is SafeOperationalFact => item !== undefined);
    return items.length ? items : undefined;
  }
  if (isRecord(value)) {
    const sanitized = sanitizeOperationalErrorFacts(value, depth + 1);
    return Object.keys(sanitized).length ? sanitized : undefined;
  }
  return undefined;
}

export function sanitizeOperationalErrorFacts(input: unknown, depth = 0): Record<string, SafeOperationalFact> {
  if (!isRecord(input)) {
    return {};
  }

  const safeFacts: Record<string, SafeOperationalFact> = {};
  for (const [key, value] of Object.entries(input)) {
    if (!allowedFactKeys.has(key) || unsafeKeyPattern.test(key)) {
      continue;
    }

    const safeValue = sanitizeFactValue(value, depth);
    if (safeValue !== undefined) {
      safeFacts[key] = safeValue;
    }
  }
  return safeFacts;
}

export function sanitizeOperationalErrorSummary(summary: unknown) {
  if (typeof summary !== 'string') {
    return 'Operational error details redacted';
  }

  const trimmed = summary.trim().slice(0, 300);
  if (!trimmed || unsafeKeyPattern.test(trimmed) || unsafeValue(trimmed)) {
    return 'Operational error details redacted';
  }
  return trimmed;
}

export function sanitizeOperationalErrorInput(input: {
  area: string;
  severity?: string;
  errorCode: string;
  summary: unknown;
  facts?: unknown;
}): SanitizedOperationalErrorInput {
  return {
    area: allowedAreas.has(input.area as OperationalErrorArea) ? (input.area as OperationalErrorArea) : 'application',
    severity: allowedSeverities.has(input.severity as OperationalErrorSeverity)
      ? (input.severity as OperationalErrorSeverity)
      : 'error',
    errorCode: input.errorCode.trim().toLowerCase().replace(/[^a-z0-9_:-]/g, '_').slice(0, 120) || 'operational_error',
    summary: sanitizeOperationalErrorSummary(input.summary),
    facts: sanitizeOperationalErrorFacts(input.facts)
  };
}
