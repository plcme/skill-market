'use client';

import { useId, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeftRight, ChevronDown, Search, X } from 'lucide-react';
import { INSTRUMENTS, searchInstruments } from '@/lib/market/catalog';
import type { ActiveInstrumentType, Instrument } from '@/lib/market/types';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/overlay';
import { Monogram } from '@/components/ui/primitives';
import { useSetParams } from '@/components/market/use-url-state';
import { cn } from '@/lib/utils';

/** Searchable combobox that writes one side of the comparison (`?a=` / `?b=`) to the URL. */
export function InstrumentPicker({ param, slug, restrictType, excludeSlug, label, tone }: {
  param: 'a' | 'b';
  slug?: string;
  restrictType?: ActiveInstrumentType;
  excludeSlug?: string;
  label: string;
  tone: 'ink' | 'accent';
}) {
  const t = useTranslations('ComparePage');
  const tt = useTranslations('Ticker');
  const { set, pending } = useSetParams();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const current = slug ? INSTRUMENTS.find(i => i.slug === slug) : undefined;

  const options = useMemo<Instrument[]>(() => {
    const pool = q.trim() ? searchInstruments(q, 40).map(h => h.instrument) : INSTRUMENTS;
    return pool.filter(i => (!restrictType || i.type === restrictType) && i.slug !== excludeSlug).slice(0, q.trim() ? 12 : 40);
  }, [q, restrictType, excludeSlug]);

  const choose = (inst: Instrument) => {
    set({ [param]: inst.slug });
    setOpen(false);
    setQ('');
  };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(options.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); const o = options[active]; if (o) choose(o); }
  };

  return (
    <div className="min-w-0">
      <p className="mb-1.5 flex items-center gap-2 text-[13px] font-medium">
        <span aria-hidden className={cn('h-0.5 w-5 rounded-full', tone === 'ink' ? 'bg-ink' : 'bg-[repeating-linear-gradient(90deg,var(--accent)_0_5px,transparent_5px_8px)]')} />
        {label}
      </p>
      <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) setQ(''); setActive(0); }}>
        <PopoverTrigger
          aria-label={current ? t('pickerChange', { label, name: current.name }) : t('pickerChoose', { label })}
          className={cn('flex h-12 w-full items-center gap-3 rounded-md border border-rule bg-surface px-3 text-left transition-colors hover:border-ink/40', pending && 'opacity-70')}
        >
          {current ? (
            <>
              <Monogram size="sm" tone={tone === 'accent' ? 'accent' : 'ink'}>{current.symbol}</Monogram>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{current.name}</span>
                <span className="block truncate text-[12px] text-muted">{tt(current.type)} · {current.category}</span>
              </span>
            </>
          ) : (
            <span className="flex-1 text-muted">{t('pickerPlaceholder')}</span>
          )}
          <ChevronDown className="size-4 shrink-0 text-muted" aria-hidden />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[min(380px,calc(100vw-24px))] p-0">
          <div className="flex items-center gap-2 border-b border-rule px-3">
            <Search className="size-4 shrink-0 text-muted" aria-hidden />
            <input
              autoFocus
              role="combobox"
              aria-expanded
              aria-controls={listId}
              aria-activedescendant={options[active] ? `${listId}-${options[active].slug}` : undefined}
              aria-label={t('pickerSearch', { label })}
              placeholder={restrictType ? t(`pickerSearchType.${restrictType}`) : t('pickerSearchAny')}
              value={q}
              onChange={e => { setQ(e.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
              className="h-11 w-full bg-transparent text-[15px] outline-none placeholder:text-faint"
            />
          </div>
          {restrictType ? <p className="px-3 pt-2 text-[12px] text-muted">{t(`pickerRestricted.${restrictType}`)}</p> : null}
          <ul id={listId} role="listbox" aria-label={label} className="max-h-72 overflow-y-auto p-1.5">
            {options.length === 0 ? <li className="px-2.5 py-3 text-sm text-muted">{t('pickerEmpty')}</li> : null}
            {options.map((o, i) => (
              <li key={o.slug} id={`${listId}-${o.slug}`} role="option" aria-selected={o.slug === slug}>
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={cn('flex w-full items-center gap-3 rounded-[4px] px-2.5 py-2 text-left', i === active && 'bg-sunken')}
                >
                  <Monogram size="sm">{o.symbol}</Monogram>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{o.name}</span>
                    <span className="block truncate text-[12px] text-muted">{tt(o.type)} · {o.category}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {current ? (
            <div className="border-t border-rule p-1.5">
              <button type="button" onClick={() => { set({ [param]: null }); setOpen(false); }} className="flex w-full items-center gap-2 rounded-[4px] px-2.5 py-2 text-[13px] text-muted hover:bg-sunken hover:text-ink">
                <X className="size-3.5" aria-hidden />{t('pickerClear')}
              </button>
            </div>
          ) : null}
        </PopoverContent>
      </Popover>
    </div>
  );
}

/** Swap the two sides without losing the filter. */
export function SwapButton({ a, b }: { a?: string; b?: string }) {
  const t = useTranslations('ComparePage');
  const { set, pending } = useSetParams();
  return (
    <Button variant="ghost" size="icon" loading={pending} disabled={!a && !b} onClick={() => set({ a: b ?? null, b: a ?? null })} aria-label={t('swap')} className="rotate-90 sm:rotate-0">
      {!pending ? <ArrowLeftRight aria-hidden /> : null}
    </Button>
  );
}
