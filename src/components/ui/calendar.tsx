'use client';

import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DayPicker, getDefaultClassNames, type DayButton } from 'react-day-picker';
import { cn } from '@/lib/utils';

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames();
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('w-fit bg-[var(--surface)] p-3 [--cell-size:2.25rem]', className)}
      classNames={{
        root: cn('w-fit', defaults.root),
        months: cn('relative flex flex-col gap-4', defaults.months),
        month: cn('flex w-full flex-col gap-3', defaults.month),
        nav: cn('absolute inset-x-0 top-0 flex items-center justify-between', defaults.nav),
        button_previous: cn(
          'grid size-9 place-items-center rounded-[var(--radius-control)] hover:bg-[var(--surface-muted)]',
          defaults.button_previous
        ),
        button_next: cn(
          'grid size-9 place-items-center rounded-[var(--radius-control)] hover:bg-[var(--surface-muted)]',
          defaults.button_next
        ),
        month_caption: cn(
          'flex h-9 items-center justify-center px-10 text-sm font-semibold',
          defaults.month_caption
        ),
        month_grid: cn('w-full border-collapse', defaults.month_grid),
        weekdays: cn('flex', defaults.weekdays),
        weekday: cn(
          'flex-1 text-center text-xs font-medium text-[var(--muted-foreground)]',
          defaults.weekday
        ),
        week: cn('mt-1 flex w-full', defaults.week),
        day: cn('relative aspect-square h-full w-full p-0 text-center', defaults.day),
        today: cn('rounded-[var(--radius-control)] bg-[var(--accent-soft)]', defaults.today),
        outside: cn('text-[var(--muted-foreground)] opacity-45', defaults.outside),
        disabled: cn('opacity-35', defaults.disabled),
        hidden: cn('invisible', defaults.hidden),
        ...classNames
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
        DayButton: CalendarDayButton,
        ...components
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  return (
    <button
      type="button"
      data-selected={modifiers.selected}
      className={cn(
        'grid size-(--cell-size) place-items-center rounded-[var(--radius-control)] text-sm transition-colors hover:bg-[var(--surface-muted)] data-[selected=true]:bg-[var(--accent)] data-[selected=true]:font-semibold data-[selected=true]:text-white',
        className
      )}
      {...props}
    >
      {day.date.getDate()}
    </button>
  );
}
