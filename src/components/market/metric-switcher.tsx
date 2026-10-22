'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, ChevronDown } from 'lucide-react';
import { metricsFor } from '@/lib/metrics/registry';
import type { ActiveInstrumentType, MetricKey } from '@/lib/market/types';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay';
import { cn } from '@/lib/utils';
import { useSetParams } from './use-url-state';

/** FR-M4: only valid metrics for the type; default → common → advanced drawer. */
export function MetricSwitcher({ type, value, onChange, param = 'metric', className }: {
  type: ActiveInstrumentType;
  value: MetricKey;
  onChange?: (m: MetricKey) => void;
  param?: string;
  className?: string;
}) {
  const t = useTranslations('Metrics');
  const { set } = useSetParams();
  const groups = metricsFor(type);
  const [open, setOpen] = useState(false);
  const [advanced, setAdvanced] = useState(groups.advanced.includes(value));
  const choose = (m: MetricKey) => {
    if (onChange) onChange(m);
    else set({ [param]: m === groups.default ? null : m });
    setOpen(false);
  };
  const item = (m: MetricKey) => (
    <li key={m}>
      <button
        type="button"
        role="menuitemradio"
        aria-checked={m === value}
        onClick={() => choose(m)}
        className="flex w-full items-start gap-2.5 rounded-[4px] px-2.5 py-2 text-left hover:bg-sunken"
      >
        <Check className={cn('mt-0.5 size-4 shrink-0', m === value ? 'text-ink' : 'invisible')} aria-hidden />
        <span className="min-w-0">
          <span className="block text-sm font-medium">{t(`${m}.label`)}</span>
          <span className="line-clamp-2 block text-[12.5px] text-muted">{t(`${m}.definition`)}</span>
        </span>
      </button>
    </li>
  );
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className={cn('inline-flex h-8 items-center gap-2 rounded-[5px] border border-rule bg-surface px-3 text-[13.5px] hover:border-ink/40', className)}>
        <span className="sr-only">{t('switcher')}: </span>
        <span className="font-medium">{t(`${value}.label`)}</span>
        <ChevronDown className="size-3.5 text-muted" aria-hidden />
      </PopoverTrigger>
      <PopoverContent className="w-[min(360px,calc(100vw-24px))] p-1.5">
        <div role="menu" aria-label={t('switcher')}>
          <p className="kicker px-2.5 pb-1 pt-1.5">{t('groupDefault')}</p>
          <ul>{item(groups.default)}</ul>
          <p className="kicker px-2.5 pb-1 pt-3">{t('groupCommon')}</p>
          <ul>{groups.common.map(item)}</ul>
          {groups.advanced.length ? (
            <>
              <button type="button" onClick={() => setAdvanced(a => !a)} aria-expanded={advanced} className="mt-1 flex w-full items-center justify-between rounded-[4px] px-2.5 py-2 text-[13px] text-accent hover:bg-sunken">
                {advanced ? t('hideAdvanced') : t('showAdvanced')}
                <ChevronDown className={cn('size-3.5 transition-transform', advanced && 'rotate-180')} aria-hidden />
              </button>
              {advanced ? (
                <>
                  <p className="kicker px-2.5 pb-1 pt-1">{t('groupAdvanced')}</p>
                  <ul>{groups.advanced.map(item)}</ul>
                </>
              ) : null}
            </>
          ) : null}
          <p className="border-t border-rule px-2.5 pb-1 pt-2 text-[12px] text-muted">{t('switcherHint')}</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
