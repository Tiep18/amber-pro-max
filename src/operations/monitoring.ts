import type { OperationalErrorArea, OperationalErrorSeverity, SafeOperationalFact } from './redaction';

export type OperationalFailureRecorder = (input: {
  area: string;
  severity?: string;
  errorCode: string;
  summary: unknown;
  facts?: unknown;
}) => Promise<unknown>;

type SafeFacts = Record<string, SafeOperationalFact>;

type MonitoredBase = {
  area: OperationalErrorArea;
  action: string;
  errorCode: string;
  summary: string;
  severity?: OperationalErrorSeverity;
  facts?: SafeFacts;
  recordOperationalFailure?: OperationalFailureRecorder;
};

type ActionResultWithStatus = {
  status: string;
  code?: string;
};

type MonitoredActionInput<TSuccess extends ActionResultWithStatus, TError extends ActionResultWithStatus> =
  MonitoredBase & {
    operation: () => Promise<TSuccess>;
    errorResult: TError;
    shouldRecordResult?: (result: TSuccess) => boolean;
  };

type MonitoredQueryInput<T> = MonitoredBase & {
  query: () => Promise<T>;
  fallback: T;
};

async function defaultOperationalFailureRecorder(input: Parameters<OperationalFailureRecorder>[0]) {
  const { recordOperationalFailure } = await import('./errors');
  return recordOperationalFailure(input);
}

function errorCodeFromResult(result: ActionResultWithStatus, fallbackCode: string) {
  return result.code ?? fallbackCode;
}

async function recordFailure(
  input: MonitoredBase,
  code: string,
  recorder = input.recordOperationalFailure ?? defaultOperationalFailureRecorder
) {
  await recorder({
    area: input.area,
    severity: input.severity ?? 'error',
    errorCode: input.errorCode,
    summary: input.summary,
    facts: {
      ...input.facts,
      action: input.action,
      code
    }
  });
}

export async function runMonitoredAction<
  TSuccess extends ActionResultWithStatus,
  TError extends ActionResultWithStatus
>(input: MonitoredActionInput<TSuccess, TError>): Promise<TSuccess | TError> {
  try {
    const result = await input.operation();
    if (input.shouldRecordResult?.(result)) {
      await recordFailure(input, errorCodeFromResult(result, input.errorResult.code ?? input.errorCode));
    }
    return result;
  } catch {
    await recordFailure(input, input.errorResult.code ?? input.errorCode);
    return input.errorResult;
  }
}

export async function runMonitoredQuery<T>(input: MonitoredQueryInput<T>): Promise<T> {
  try {
    return await input.query();
  } catch {
    await recordFailure(input, input.errorCode);
    return input.fallback;
  }
}
