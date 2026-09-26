'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { instrumentPath } from '@/lib/links';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowRight, CornerDownLeft, Search } from 'lucide-react';
import { Dialog as RDialog } from 'radix-ui';
import { searchInstruments } from '@/lib/market/catalog';
import { Kbd, Monogram } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export const OPEN_SEARCH_EVENT = 'sm:open-search';
export function openSearch() {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}

const SUGGESTED = ['rust', 'dbt', 'data-analyst', 'terraform', 'cybersecurity', 'software-engineer'];

/** ⌘K / "/" search with alias normalisation (FR-D6). */
export function CommandPalette() {
  const t = useTranslations('Search');
  const tt = useTranslations('Ticker');
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        setOpen(o => !o);
      }
    };
    window.addEventListener(OPEN_SEARCH_EVENT, onOpen);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, onOpen);
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const hits = useMemo(() => (q.trim() ? searchInstruments(q, 8) : []), [q]);
  const suggestions = useMemo(() => SUGGESTED.flatMap(s => searchInstruments(s, 1)), []);
  const list = q.trim() ? hits : suggestions;

  const go = (i: number) => {
    const hit = list[i];
    setOpen(false);
    setQ('');
    if (hit) router.push(instrumentPath(hit.instrument.type, hit.instrument.slug));
    else if (q.trim()) router.push(`/search?q=${encodeURIComponent(q.trim())}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(list.length, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (active === list.length && q.trim()) { setOpen(false); router.push(`/search?q=${encodeURIComponent(q.trim())}`); setQ(''); } else go(active); }
  };

  return (
    <RDialog.Root open={open} onOpenChange={o => { setOpen(o); if (!o) setQ(''); setActive(0); }}>
      <RDialog.Portal>
        <RDialog.Overlay className="fixed inset-0 z-50 bg-overlay animate-fade" />
        <RDialog.Content className="fixed left-1/2 top-[10vh] z-50 w-[calc(100vw-24px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-lg border border-rule bg-surface shadow-float animate-rise" aria-describedby={undefined}>
          <RDialog.Title className="sr-only">{t('dialogLabel')}</RDialog.Title>
          <div className="flex items-center gap-3 border-b border-rule px-4">
            <Search className="size-4 shrink-0 text-muted" aria-hidden />
            <input
              autoFocus
              value={q}
              onChange={e => { setQ(e.target.value); setActive(0); }}
              onKeyDown={onKeyDown}
              placeholder={t('placeholder')}
              aria-label={t('dialogLabel')}
              aria-controls="palette-results"
              aria-activedescendant={list[active] ? `palette-${list[active].instrument.slug}` : undefined}
              className="h-14 w-full bg-transparent text-[17px] outline-none placeholder:text-faint"
            />
            <Kbd>Esc</Kbd>
          </div>
          <div className="max-h-[60vh] overflow-y-auto p-2">
            {!q.trim() ? <p className="kicker px-2 pb-1 pt-2">{t('suggestions')}</p> : null}
            {q.trim() && list.length === 0 ? (
              <div className="px-3 py-6">
                <p className="font-medium">{t('empty', { q })}</p>
                <p className="mt-1 text-sm text-muted">{t('emptyHint')}</p>
              </div>
            ) : null}
            <ul id="palette-results" role="listbox" ref={listRef} aria-label={t('dialogLabel')}>
              {list.map((h, i) => (
                <li key={h.instrument.id} id={`palette-${h.instrument.slug}`} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(i)}
                    className={cn('flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left', i === active && 'bg-sunken')}
                  >
                    <Monogram size="sm">{h.instrument.symbol}</Monogram>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{h.instrument.name}</span>
                      <span className="block truncate text-[12.5px] text-muted">
                        {tt(h.instrument.type)} · {h.instrument.category}
                        {h.via === 'alias' ? <span className="ml-2 text-accent">{t('matchedAlias', { alias: h.matched })}</span> : null}
                      </span>
                    </span>
                    {i === active ? <CornerDownLeft className="size-4 text-muted" aria-hidden /> : null}
                  </button>
                </li>
              ))}
            </ul>
            {q.trim() ? (
              <button type="button" onMouseEnter={() => setActive(list.length)} onClick={() => { setOpen(false); router.push(`/search?q=${encodeURIComponent(q.trim())}`); setQ(''); }} className={cn('mt-1 flex w-full items-center justify-between rounded-md px-2.5 py-2.5 text-sm text-accent', active === list.length && 'bg-sunken')}>
                {t('seeAll', { q })}
                <ArrowRight className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
          <div className="hidden items-center gap-4 border-t border-rule px-4 py-2 text-[12px] text-muted sm:flex">
            <span className="inline-flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd>{t('navigate')}</span>
            <span className="inline-flex items-center gap-1.5"><Kbd>↵</Kbd>{t('select')}</span>
          </div>
        </RDialog.Content>
      </RDialog.Portal>
    </RDialog.Root>
  );
}
