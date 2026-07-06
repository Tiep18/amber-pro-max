'use client';

import { useId, useRef, useState } from 'react';
import type { CatalogSort } from '@/catalog/queries';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

export function CatalogSortSelect({
  name,
  label,
  value,
  options
}: {
  name: string;
  label: string;
  value: CatalogSort;
  options: Array<{ value: CatalogSort; label: string }>;
}) {
  const labelId = useId();
  const [selected, setSelected] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  function updateSort(nextValue: string) {
    const nextSort = nextValue as CatalogSort;
    setSelected(nextSort);

    window.requestAnimationFrame(() => {
      inputRef.current?.form?.requestSubmit();
    });
  }

  return (
    <label className="grid min-w-0 gap-1 text-sm font-semibold">
      <span id={labelId} className="sr-only sm:not-sr-only">
        {label}
      </span>
      <input ref={inputRef} type="hidden" name={name} value={selected} />
      <Select value={selected} onValueChange={updateSort}>
        <SelectTrigger
          aria-labelledby={labelId}
          className="!h-10 !min-h-10 bg-[var(--surface)] px-3 text-sm shadow-[inset_0_1px_0_rgb(255_255_255/55%)] hover:bg-[var(--surface-paper)] sm:!h-11 sm:!min-h-11 sm:text-base"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  );
}
