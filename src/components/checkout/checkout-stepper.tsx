import Link from 'next/link';
import type {Locale} from '@/i18n/routing';
import {getCartPath} from '@/i18n/routing';

export type CheckoutStep = 'cart' | 'details' | 'payment' | 'done';

const STEP_ORDER: CheckoutStep[] = ['cart', 'details', 'payment', 'done'];

const copy = {
  en: {cart: 'Cart', details: 'Details', payment: 'Payment', done: 'Done'},
  vi: {cart: 'Giỏ hàng', details: 'Thông tin', payment: 'Thanh toán', done: 'Hoàn tất'}
} as const;

export function CheckoutStepper({current, locale}: {current: CheckoutStep; locale: Locale}) {
  const t = copy[locale];
  const currentIndex = STEP_ORDER.indexOf(current);

  return (
    <ol className="flex items-center gap-1.5 text-sm sm:gap-2">
      {STEP_ORDER.map((step, index) => {
        const isActive = step === current;
        const isComplete = index < currentIndex;
        const label = t[step];
        const numberClassName = isActive
          ? 'bg-[var(--accent)] text-white'
          : isComplete
            ? 'bg-[var(--surface-muted)] text-[var(--foreground)]'
            : 'bg-[var(--surface-muted)] text-[var(--muted-foreground)]';
        const labelClassName = isActive
          ? 'font-semibold text-[var(--foreground)]'
          : isComplete
            ? 'text-[var(--foreground)]'
            : 'text-[var(--muted-foreground)]';

        return (
          <li key={step} className="flex items-center gap-1.5 sm:gap-2">
            {index > 0 ? <span aria-hidden="true" className="h-px w-3 bg-[var(--border)] sm:w-6" /> : null}
            {step === 'cart' && !isActive ? (
              <Link
                href={getCartPath(locale)}
                className="flex items-center gap-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2"
              >
                <span className={`grid size-5 shrink-0 place-items-center rounded-full text-xs font-semibold ${numberClassName}`}>
                  {index + 1}
                </span>
                <span className={`hidden sm:inline ${labelClassName}`}>{label}</span>
              </Link>
            ) : (
              <span aria-current={isActive ? 'step' : undefined} className="flex items-center gap-1.5">
                <span className={`grid size-5 shrink-0 place-items-center rounded-full text-xs font-semibold ${numberClassName}`}>
                  {index + 1}
                </span>
                <span className={`${isActive ? 'inline' : 'hidden sm:inline'} ${labelClassName}`}>{label}</span>
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
