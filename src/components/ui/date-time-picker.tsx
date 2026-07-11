'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarClock } from 'lucide-react';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
import { cn } from '@/lib/utils';

const DATETIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export function parseLocalDateTime(value?: string) {
  const match = value?.match(DATETIME_PATTERN);
  if (!match) {
    const parsed = value ? new Date(value) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  }
  const [, year, month, day, hour, minute] = match;
  const date = new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatLocalDateTime(date: Date) {
  const part = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${part(date.getMonth() + 1)}-${part(date.getDate())}T${part(date.getHours())}:${part(date.getMinutes())}`;
}

type DateTimePickerProps = {
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  name?: string;
  id?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  'aria-label'?: string;
  className?: string;
  submissionFormat?: 'local' | 'iso';
};

export function DateTimePicker({
  value,
  defaultValue = '',
  onChange,
  name,
  id,
  required,
  disabled,
  placeholder = 'Choose date and time',
  className,
  submissionFormat = 'local',
  'aria-label': ariaLabel
}: DateTimePickerProps) {
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value ?? internalValue;
  const selected = parseLocalDateTime(currentValue);

  const update = (next: string) => {
    if (value === undefined) setInternalValue(next);
    onChange?.(next);
  };
  const updatePart = (part: 'hour' | 'minute', next: string) => {
    const date = selected ? new Date(selected) : new Date();
    if (part === 'hour') date.setHours(Number(next));
    else date.setMinutes(Number(next));
    date.setSeconds(0, 0);
    update(formatLocalDateTime(date));
  };

  return (
    <div className={cn('grid gap-1.5', className)}>
      {name ? (
        <input
          type="hidden"
          name={name}
          value={submissionFormat === 'iso' && selected ? selected.toISOString() : currentValue}
        />
      ) : null}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="secondary"
            disabled={disabled}
            aria-label={ariaLabel}
            aria-required={required}
            className="w-full justify-start gap-2 px-3 text-left text-sm font-normal"
          >
            <CalendarClock
              className="size-4 shrink-0 text-[var(--muted-foreground)]"
              aria-hidden="true"
            />
            <span
              className={cn(
                'min-w-0 flex-1 truncate',
                !selected && 'text-[var(--muted-foreground)]'
              )}
            >
              {selected ? format(selected, 'MMM d, yyyy · HH:mm') : placeholder}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto max-w-[calc(100vw-2rem)] p-0">
          <Calendar
            mode="single"
            selected={selected ?? undefined}
            onSelect={(date) => {
              if (!date) return;
              const next = new Date(date);
              next.setHours(selected?.getHours() ?? 9, selected?.getMinutes() ?? 0, 0, 0);
              update(formatLocalDateTime(next));
            }}
          />
          <div className="grid grid-cols-2 gap-2 border-t border-[var(--border)] p-3">
            <Select
              value={selected ? String(selected.getHours()).padStart(2, '0') : '09'}
              onValueChange={(next) => updatePart('hour', next)}
            >
              <SelectTrigger aria-label="Hour" className="min-h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, '0')).map(
                  (hour) => (
                    <SelectItem key={hour} value={hour}>
                      {hour}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
            <Select
              value={selected ? String(selected.getMinutes()).padStart(2, '0') : '00'}
              onValueChange={(next) => updatePart('minute', next)}
            >
              <SelectTrigger aria-label="Minute" className="min-h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 60 }, (_, minute) => String(minute).padStart(2, '0')).map(
                  (minute) => (
                    <SelectItem key={minute} value={minute}>
                      {minute}
                    </SelectItem>
                  )
                )}
              </SelectContent>
            </Select>
          </div>
          {selected ? (
            <div className="border-t border-[var(--border)] p-3 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="min-h-9 w-full text-sm"
                onClick={() => update('')}
              >
                Clear date and time
              </Button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}
