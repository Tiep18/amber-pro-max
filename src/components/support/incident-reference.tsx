'use client';

import {useRef, useState} from 'react';
import {Copy} from 'lucide-react';
import {createTranslator} from 'next-intl';
import {Button} from '@/components/ui/button';
import type {Locale} from '@/i18n/routing';
import enMessages from '@/messages/en.json';
import viMessages from '@/messages/vi.json';

export function IncidentReference({incidentId, locale}: {incidentId: string; locale: Locale}) {
  const valueRef = useRef<HTMLElement | null>(null);
  const [result, setResult] = useState<'idle' | 'copied' | 'failed'>('idle');
  const t = createTranslator({
    locale,
    messages: locale === 'vi' ? viMessages : enMessages,
    namespace: 'support.incident'
  });

  function selectForManualCopy() {
    const value = valueRef.current;
    if (!value) return;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(value);
    selection?.removeAllRanges();
    selection?.addRange(range);
  }

  async function copyIncidentId() {
    try {
      await navigator.clipboard.writeText(incidentId);
      setResult('copied');
    } catch {
      selectForManualCopy();
      setResult('failed');
    }
  }

  return (
    <div className="grid gap-2 rounded-[var(--radius-control)] bg-[var(--surface-muted)] p-3">
      <p className="grid gap-1 text-sm">
        <span className="text-[var(--muted-foreground)]">{t('label')}</span>
        <code ref={valueRef} className="break-all font-semibold tabular-nums text-[var(--foreground)]">
          {incidentId}
        </code>
      </p>
      <Button
        type="button"
        variant="secondary"
        className="min-h-11 w-fit gap-2"
        onClick={() => void copyIncidentId()}
      >
        <Copy aria-hidden="true" className="size-4" />
        {t('copy')}
      </Button>
      <p aria-live="polite" className="min-h-5 text-sm text-[var(--muted-foreground)]">
        {result === 'copied' ? t('copied') : result === 'failed' ? t('copyFailed') : ''}
      </p>
    </div>
  );
}
