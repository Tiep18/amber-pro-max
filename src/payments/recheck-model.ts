export type RecheckModelInput = {
  nowMs: number;
  cooldownUntilMs: number;
  pollEndsAtMs: number;
  visible: boolean;
  eligible: boolean;
  pollStoppedAnnounced: boolean;
};

export type RecheckModel = {
  pollEndsAtMs: number;
  canRecheck: boolean;
  cooldownWakeAtMs: number | null;
  shouldPoll: boolean;
  pollEnded: boolean;
  shouldAnnouncePollStopped: boolean;
};

export function createRecheckDeadline(startedAtMs: number, pollWindowMs: number) {
  return startedAtMs + Math.max(0, pollWindowMs);
}

export function getRecheckModel({
  nowMs,
  cooldownUntilMs,
  pollEndsAtMs,
  visible,
  eligible,
  pollStoppedAnnounced
}: RecheckModelInput): RecheckModel {
  const coolingDown = eligible && cooldownUntilMs > nowMs;
  const pollEnded = eligible && nowMs >= pollEndsAtMs;

  return {
    pollEndsAtMs,
    canRecheck: eligible && !coolingDown,
    cooldownWakeAtMs: coolingDown ? cooldownUntilMs : null,
    shouldPoll: eligible && visible && !pollEnded && !coolingDown,
    pollEnded,
    shouldAnnouncePollStopped: pollEnded && !pollStoppedAnnounced
  };
}
