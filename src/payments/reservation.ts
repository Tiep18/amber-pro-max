// Single source of truth for the PayPal inventory-hold window. Referenced by
// the migration comment in
// supabase/migrations/20260801180000_widen_paypal_reservation_window.sql,
// the countdown's urgency thresholds, and checkout copy — keep all three in
// sync by importing from here rather than repeating the numbers.
export const PAYPAL_RESERVATION_WINDOW_MINUTES = 25;

/**
 * The floor the hold is pushed to when the buyer actually hands off to PayPal,
 * and the hard ceiling measured from order creation that stops a buyer who
 * reopens the PayPal button in a loop from holding stock indefinitely.
 *
 * Referenced by
 * supabase/migrations/20260802180000_extend_paypal_reservation_on_handoff.sql
 * — keep both sides in sync.
 */
export const PAYPAL_HANDOFF_MIN_WINDOW_MINUTES = 10;
export const PAYPAL_MAX_HOLD_MINUTES = 120;

/**
 * How long after the hold expires the shop may still accept a payment that
 * really did arrive — a bank transfer reconciled the next morning, or a PayPal
 * capture that landed late. Past this, the order can only be refunded.
 *
 * Shop owner decision (2026-08-02). Referenced by
 * `public.late_settlement_window()` in
 * supabase/migrations/20260802170000_late_payment_settlement.sql — keep both
 * sides in sync.
 */
export const LATE_SETTLEMENT_WINDOW_DAYS = 7;

/**
 * How often the payment-expiry HTTP fallback is expected to run, and how stale
 * a fallback run may be before `/admin/launch` reports the expiry job as down.
 *
 * The primary schedule is pg_cron inside Supabase
 * (supabase/migrations/20260802130000_supabase_scheduled_jobs.sql); this
 * fallback only matters when the deployment also wires
 * `/api/cron/expire-payments` to an external scheduler. If it does, this must
 * match that scheduler's interval — hosting plans that cap cron frequency
 * (Vercel Hobby allows one run per day) must raise it, or the launch gate will
 * report a healthy fallback as blocked.
 */
export const PAYMENT_EXPIRY_FALLBACK_INTERVAL_MINUTES = 1;
export const RESERVATION_COUNTDOWN_WARNING_MINUTES = 5;
export const RESERVATION_COUNTDOWN_CRITICAL_MINUTES = 1;
