import type { OperationalErrorArea, OperationalErrorSeverity, SafeOperationalFact } from './redaction';

export type OperationalFailureRecorder = (input: {
  area: string;
  severity?: string;
  errorCode: string;
  summary: unknown;
  facts?: unknown;
}) => Promise<unknown>;

type OperationalRecordResult = Awaited<ReturnType<OperationalFailureRecorder>>;

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
    factsFromResult?: (result: TSuccess) => SafeFacts;
    factsFromError?: (error: unknown) => SafeFacts;
    decorateErrorResult?: (errorResult: TError, recordResult: OperationalRecordResult | undefined) => TError;
  };

type MonitoredQueryInput<T> = MonitoredBase & {
  query: () => Promise<T>;
  fallback: T;
  factsFromError?: (error: unknown) => SafeFacts;
};

type MonitoredThrowingQueryInput<T> = MonitoredBase & {
  query: () => Promise<T>;
  publicError: Error | (() => Error);
  code?: string;
  factsFromError?: (error: unknown) => SafeFacts;
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
  dynamicFacts?: SafeFacts,
  recorder = input.recordOperationalFailure ?? defaultOperationalFailureRecorder
) {
  return recorder({
    area: input.area,
    severity: input.severity ?? 'error',
    errorCode: input.errorCode,
    summary: input.summary,
    facts: {
      ...input.facts,
      ...dynamicFacts,
      action: input.action,
      code
    }
  });
}

async function safeRecordFailure(input: MonitoredBase, code: string, dynamicFacts?: SafeFacts) {
  try {
    return await recordFailure(input, code, dynamicFacts);
  } catch {
    // Operational monitoring must never change the business result.
    return undefined;
  }
}

export async function runMonitoredAction<
  TSuccess extends ActionResultWithStatus,
  TError extends ActionResultWithStatus
>(input: MonitoredActionInput<TSuccess, TError>): Promise<TSuccess | TError> {
  try {
    const result = await input.operation();
    if (input.shouldRecordResult?.(result)) {
      await safeRecordFailure(
        input,
        errorCodeFromResult(result, input.errorResult.code ?? input.errorCode),
        input.factsFromResult?.(result)
      );
    }
    return result;
  } catch (error) {
    const recordResult = await safeRecordFailure(
      input,
      input.errorResult.code ?? input.errorCode,
      input.factsFromError?.(error)
    );
    return input.decorateErrorResult?.(input.errorResult, recordResult) ?? input.errorResult;
  }
}

export async function runMonitoredQuery<T>(input: MonitoredQueryInput<T>): Promise<T> {
  try {
    return await input.query();
  } catch (error) {
    await safeRecordFailure(input, input.errorCode, input.factsFromError?.(error));
    return input.fallback;
  }
}

export async function runMonitoredThrowingQuery<T>(input: MonitoredThrowingQueryInput<T>): Promise<T> {
  try {
    return await input.query();
  } catch (error) {
    await safeRecordFailure(input, input.code ?? input.errorCode, input.factsFromError?.(error));
    throw typeof input.publicError === 'function' ? input.publicError() : input.publicError;
  }
}
