'use client';

import {useId, useMemo, useRef, useState} from 'react';
import {Check, ChevronsUpDown, Search} from 'lucide-react';
import {normalizeShippingSearchText, type ShippingSubdivisionOption} from '@/checkout/shipping-address-ui';
import type {Locale} from '@/i18n/routing';
import {cn} from '@/lib/utils';
import {Button} from './button';
import {Input} from './input';
import {Popover, PopoverContent, PopoverTrigger} from './popover';

type SearchableSelectProps = {
  id: string;
  locale: Locale;
  label: string;
  placeholder: string;
  searchLabel: string;
  emptyLabel: string;
  options: ShippingSubdivisionOption[];
  value: string;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  errorMessageId?: string;
  onValueChange: (value: string) => void;
  onTouched?: () => void;
};

export function SearchableSelect({
  id,
  locale,
  label,
  placeholder,
  searchLabel,
  emptyLabel,
  options,
  value,
  disabled = false,
  invalid = false,
  describedBy,
  errorMessageId,
  onValueChange,
  onTouched
}: SearchableSelectProps) {
  const generatedId = useId().replace(/:/g, '');
  const listboxId = `${id}-${generatedId}-listbox`;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const selected = options.find((option) => option.code === value) ?? null;
  const filtered = useMemo(() => {
    const normalized = normalizeShippingSearchText(query, locale);
    return normalized ? options.filter((option) => option.searchText.includes(normalized)) : options;
  }, [locale, options, query]);
  const boundedActiveIndex = filtered.length ? Math.min(activeIndex, filtered.length - 1) : 0;
  const activeOptionId = filtered[boundedActiveIndex]
    ? `${listboxId}-option-${filtered[boundedActiveIndex].code}`
    : undefined;

  function select(code: string) {
    onValueChange(code);
    onTouched?.();
    setOpen(false);
    setQuery('');
    setActiveIndex(0);
  }

  function handleSearchKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => (filtered.length ? (current + 1) % filtered.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) =>
        filtered.length ? (current - 1 + filtered.length) % filtered.length : 0
      );
    } else if (event.key === 'Enter' && filtered[boundedActiveIndex]) {
      event.preventDefault();
      select(filtered[boundedActiveIndex].code);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (disabled) return;
        setOpen(nextOpen);
        if (!nextOpen) {
          setQuery('');
          setActiveIndex(0);
          onTouched?.();
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="secondary"
          role="combobox"
          aria-label={label}
          aria-expanded={open}
          aria-controls={listboxId}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          aria-errormessage={invalid ? errorMessageId : undefined}
          disabled={disabled}
          className="min-h-11 w-full min-w-0 justify-between gap-3 px-3 text-left font-normal"
        >
          <span className={cn('min-w-0 whitespace-normal break-words', !selected && 'text-[var(--muted-foreground)]')}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown aria-hidden="true" className="size-4 shrink-0 text-[var(--muted-foreground)]" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(var(--radix-popover-trigger-width),calc(100vw-1.5rem))] min-w-[var(--radix-popover-trigger-width)] p-2"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchRef.current?.focus();
        }}
      >
        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            ref={searchRef}
            value={query}
            aria-label={searchLabel}
            aria-controls={listboxId}
            aria-activedescendant={activeOptionId}
            autoComplete="off"
            className="pl-9"
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
          />
        </div>
        <div
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="mt-2 max-h-64 overflow-y-auto overscroll-contain"
        >
          {filtered.length ? (
            filtered.map((option, index) => {
              const isSelected = option.code === value;
              const isActive = index === boundedActiveIndex;
              return (
                <div
                  id={`${listboxId}-option-${option.code}`}
                  key={option.code}
                  role="option"
                  aria-selected={isSelected}
                  className={cn(
                    'flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm outline-none',
                    isActive && 'bg-[var(--surface-muted)]',
                    isSelected && 'font-semibold text-[var(--accent)]'
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => select(option.code)}
                >
                  <Check aria-hidden="true" className={cn('size-4 shrink-0', !isSelected && 'invisible')} />
                  <span className="min-w-0 break-words">{option.label}</span>
                </div>
              );
            })
          ) : (
            <p role="status" className="px-3 py-4 text-sm text-[var(--muted-foreground)]">
              {emptyLabel}
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
