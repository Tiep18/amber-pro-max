import {describe, expect, test} from 'vitest';
import {createRecheckDeadline, getRecheckModel} from '@/payments/recheck-model';

describe('payment recheck timing model', () => {
  test('captures one absolute polling deadline from the original eligible state', () => {
    expect(createRecheckDeadline(1_000, 30_000)).toBe(31_000);
    expect(createRecheckDeadline(25_000, 30_000)).toBe(55_000);
  });

  test('schedules the exact cooldown wake and re-enables at the deadline', () => {
    const cooling = getRecheckModel({
      nowMs: 4_999,
      cooldownUntilMs: 5_000,
      pollEndsAtMs: 30_000,
      visible: true,
      eligible: true,
      pollStoppedAnnounced: false
    });
    const ready = getRecheckModel({
      nowMs: 5_000,
      cooldownUntilMs: 5_000,
      pollEndsAtMs: 30_000,
      visible: true,
      eligible: true,
      pollStoppedAnnounced: false
    });

    expect(cooling.canRecheck).toBe(false);
    expect(cooling.cooldownWakeAtMs).toBe(5_000);
    expect(ready.canRecheck).toBe(true);
    expect(ready.cooldownWakeAtMs).toBeNull();
  });

  test('hidden tabs perform no automatic refresh and do not extend the original deadline', () => {
    const hidden = getRecheckModel({
      nowMs: 10_000,
      cooldownUntilMs: 0,
      pollEndsAtMs: 30_000,
      visible: false,
      eligible: true,
      pollStoppedAnnounced: false
    });
    const resumed = getRecheckModel({
      nowMs: 29_999,
      cooldownUntilMs: 0,
      pollEndsAtMs: 30_000,
      visible: true,
      eligible: true,
      pollStoppedAnnounced: false
    });

    expect(hidden.shouldPoll).toBe(false);
    expect(hidden.pollEndsAtMs).toBe(30_000);
    expect(resumed.shouldPoll).toBe(true);
    expect(resumed.pollEndsAtMs).toBe(30_000);
  });

  test('ends work at the original deadline and announces termination once', () => {
    const ended = getRecheckModel({
      nowMs: 30_000,
      cooldownUntilMs: 0,
      pollEndsAtMs: 30_000,
      visible: true,
      eligible: true,
      pollStoppedAnnounced: false
    });
    const alreadyAnnounced = getRecheckModel({
      nowMs: 35_000,
      cooldownUntilMs: 0,
      pollEndsAtMs: 30_000,
      visible: true,
      eligible: true,
      pollStoppedAnnounced: true
    });

    expect(ended.shouldPoll).toBe(false);
    expect(ended.pollEnded).toBe(true);
    expect(ended.shouldAnnouncePollStopped).toBe(true);
    expect(alreadyAnnounced.shouldAnnouncePollStopped).toBe(false);
  });

  test('terminal or ineligible state stops all polling and button work', () => {
    expect(
      getRecheckModel({
        nowMs: 5_000,
        cooldownUntilMs: 0,
        pollEndsAtMs: 30_000,
        visible: true,
        eligible: false,
        pollStoppedAnnounced: false
      })
    ).toMatchObject({canRecheck: false, shouldPoll: false, shouldAnnouncePollStopped: false});
  });
});
