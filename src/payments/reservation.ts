// Single source of truth for the PayPal inventory-hold window. Referenced by
// the migration comment in
// supabase/migrations/20260801180000_widen_paypal_reservation_window.sql,
// the countdown's urgency thresholds, and checkout copy — keep all three in
// sync by importing from here rather than repeating the numbers.
export const PAYPAL_RESERVATION_WINDOW_MINUTES = 25;

/**
 * How often the payment-expiry HTTP fallback is expected to run. Must match
 * the `crons[].schedule` in `vercel.json`, and drives how stale a fallback run
 * may be before `/admin/launch` reports the expiry job as down.
 *
 * Hosting plans that cap cron frequency (Vercel Hobby allows one run per day)
 * must raise this to match, or the launch gate will report a healthy fallback
 * as blocked.
 */
export const PAYMENT_EXPIRY_FALLBACK_INTERVAL_MINUTES = 1;
export const RESERVATION_COUNTDOWN_WARNING_MINUTES = 5;
export const RESERVATION_COUNTDOWN_CRITICAL_MINUTES = 1;
