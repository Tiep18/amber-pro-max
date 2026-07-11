import { describe, expect, it } from 'vitest';
import { formatLocalDateTime, parseLocalDateTime } from '@/components/ui/date-time-picker';

describe('DateTimePicker value contract', () => {
  it('round-trips the local datetime value used by admin forms', () => {
    const parsed = parseLocalDateTime('2026-06-15T04:30');
    expect(parsed).not.toBeNull();
    expect(formatLocalDateTime(parsed!)).toBe('2026-06-15T04:30');
  });

  it('accepts stored ISO timestamps for display', () => {
    const parsed = parseLocalDateTime('2026-06-15T04:30:00.000Z');
    expect(parsed?.toISOString()).toBe('2026-06-15T04:30:00.000Z');
  });

  it('rejects malformed values', () => {
    expect(parseLocalDateTime('not-a-date')).toBeNull();
  });
});
