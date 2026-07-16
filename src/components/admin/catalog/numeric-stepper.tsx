'use client';

import {Minus, Plus} from 'lucide-react';
import {parseWholeNumberText, stepWholeNumberText} from '@/catalog/variant-numeric';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {cn} from '@/lib/utils';

type NumericStepperProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur: () => void;
  error?: string;
  disabled?: boolean;
  quickSteps?: number[];
};

export function NumericStepper({
  id,
  label,
  value,
  onChange,
  onBlur,
  error,
  disabled = false,
  quickSteps = []
}: NumericStepperProps) {
  const parsed = parseWholeNumberText(value, label.toLowerCase());
  const errorId = `${id}-error`;

  function step(delta: number) {
    onChange(stepWholeNumberText(value, delta));
  }

  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="grid min-w-0 grid-cols-[44px_minmax(0,1fr)_44px] overflow-hidden rounded-[var(--radius-control)] border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent)]/25">
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 min-w-11 rounded-none border-r border-[var(--border)] px-0 focus-visible:z-10"
          aria-label={`Decrease ${label} by 1`}
          disabled={disabled || (parsed.valid && parsed.value === 0)}
          onClick={() => step(-1)}
        >
          <Minus aria-hidden="true" className="size-4" />
        </Button>
        <Input
          id={id}
          type="text"
          role="spinbutton"
          inputMode="numeric"
          autoComplete="off"
          className="min-w-0 rounded-none border-0 text-center tabular-nums focus-visible:border-transparent focus-visible:ring-0"
          value={value}
          disabled={disabled}
          aria-valuemin={0}
          aria-valuenow={parsed.valid ? parsed.value : undefined}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
            event.preventDefault();
            step(event.key === 'ArrowUp' ? 1 : -1);
          }}
        />
        <Button
          type="button"
          variant="ghost"
          className="min-h-11 min-w-11 rounded-none border-l border-[var(--border)] px-0 focus-visible:z-10"
          aria-label={`Increase ${label} by 1`}
          disabled={disabled || (parsed.valid && parsed.value === Number.MAX_SAFE_INTEGER)}
          onClick={() => step(1)}
        >
          <Plus aria-hidden="true" className="size-4" />
        </Button>
      </div>
      {quickSteps.length ? (
        <div className="flex flex-wrap gap-2" aria-label={`${label} quick adjustments`}>
          {quickSteps.map((delta) => (
            <Button
              key={delta}
              type="button"
              variant="secondary"
              className="min-h-11 min-w-11 px-3 text-sm tabular-nums"
              aria-label={`Increase ${label} by ${delta}`}
              disabled={disabled || (parsed.valid && parsed.value === Number.MAX_SAFE_INTEGER)}
              onClick={() => step(delta)}
            >
              +{delta}
            </Button>
          ))}
        </div>
      ) : null}
      <p
        id={errorId}
        className={cn('min-h-5 text-xs leading-5', error ? 'text-[var(--destructive)]' : 'text-transparent')}
      >
        {error ?? 'No error'}
      </p>
    </div>
  );
}
