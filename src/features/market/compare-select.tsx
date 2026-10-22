'use client';

import { createContext, useCallback, useContext, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Checkbox as RCheckbox } from 'radix-ui';
import { Check, GitCompareArrows, X } from 'lucide-react';
import type { ActiveInstrumentType } from '@/lib/market/types';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { COMPARE_MAX, compareBlocker, compareHref, toggleCompare, type CompareItem } from './logic';

// Board → /compare: a selection mode on the market board replaces the Compare
// item in the primary nav. State is local to the board (not in the URL).

interface CompareCtx {
  active: boolean;
  selection: CompareItem[];
  setActive: (on: boolean) => void;
  toggle: (item: CompareItem) => void;
  clear: () => void;
}

const Ctx = createContext<CompareCtx | null>(null);

function useCompare(): CompareCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCompare must be used inside <CompareSelectionProvider>');
  return ctx;
}

export function CompareSelectionProvider({ children }: { children: React.ReactNode }) {
  const [active, setActiveState] = useState(false);
  const [selection, setSelection] = useState<CompareItem[]>([]);
  const setActive = useCallback((on: boolean) => {
    setActiveState(on);
    if (!on) setSelection([]);
  }, []);
  const toggle = useCallback((item: CompareItem) => setSelection(s => toggleCompare(s, item).selection), []);
  const clear = useCallback(() => setSelection([]), []);
  const value = useMemo(() => ({ active, selection, setActive, toggle, clear }), [active, selection, setActive, toggle, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** Toolbar button that turns row selection on and off. */
export function CompareModeToggle({ className }: { className?: string }) {
  const t = useTranslations('MarketPage');
  const { active, setActive } = useCompare();
  return (
    <Button variant={active ? 'primary' : 'subtle'} size="sm" aria-pressed={active} onClick={() => setActive(!active)} className={className}>
      <GitCompareArrows aria-hidden />
      {active ? t('compareModeOn') : t('compareMode')}
    </Button>
  );
}

/** Per-row / per-card checkbox; renders nothing until selection mode is on. */
export function CompareCheckbox({ slug, type, name, className }: { slug: string; type: ActiveInstrumentType; name: string; className?: string }) {
  const t = useTranslations('MarketPage');
  const { active, selection, toggle } = useCompare();
  const hintId = useId();
  if (!active) return null;
  const item = { slug, type };
  const checked = selection.some(s => s.slug === slug);
  const blocker = checked ? null : compareBlocker(selection, item);
  const hint = blocker === 'type' ? t('compareBlockedType') : blocker === 'max' ? t('compareBlockedMax', { max: COMPARE_MAX }) : undefined;
  return (
    <>
    <RCheckbox.Root
      checked={checked}
      disabled={blocker !== null}
      onCheckedChange={() => toggle(item)}
      aria-label={t('compareSelect', { name })}
      aria-describedby={hint ? hintId : undefined}
      title={hint}
      className={cn(
        'relative z-10 grid size-5 shrink-0 place-items-center rounded-[3px] border border-ink/50 bg-surface transition-colors disabled:cursor-not-allowed disabled:opacity-35 data-[state=checked]:border-ink data-[state=checked]:bg-ink data-[state=checked]:text-paper',
        className,
      )}
    >
      <RCheckbox.Indicator>
        <Check className="size-3.5" strokeWidth={3} aria-hidden />
      </RCheckbox.Indicator>
    </RCheckbox.Root>
    {/* Why it's disabled, for screen readers (the title tooltip is mouse-only). */}
    {hint ? <span id={hintId} className="sr-only">{hint}</span> : null}
    </>
  );
}

/** Sticky action bar while selecting: count, hint and the link to /compare. */
export function CompareBar() {
  const t = useTranslations('MarketPage');
  const { active, selection, setActive, clear } = useCompare();
  if (!active) return null;
  const n = selection.length;
  const ready = n >= 2;
  return (
    <>
      <div aria-hidden className="h-20" />
      <div
        role="region"
        aria-label={t('compareBarLabel')}
        className="no-print fixed inset-x-3 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 mx-auto flex max-w-xl items-center gap-3 rounded-md border border-rule-strong bg-paper px-3 py-2.5 shadow-float sm:px-4 md:bottom-6"
      >
        <p className="min-w-0 flex-1 text-[13px] leading-snug text-ink-2" aria-live="polite">
          {ready ? t('compareBarReady') : t('compareBarHint', { n: COMPARE_MAX - n })}
        </p>
        {n ? (
          <Button variant="ghost" size="sm" onClick={clear}>{t('compareClear')}</Button>
        ) : (
          <Button variant="ghost" size="icon-sm" onClick={() => setActive(false)} aria-label={t('compareExit')}><X aria-hidden /></Button>
        )}
        {ready ? (
          <Button asChild size="sm"><Link href={compareHref(selection)}>{t('compareGo', { n })}</Link></Button>
        ) : (
          <Button size="sm" disabled>{t('compareGo', { n })}</Button>
        )}
      </div>
    </>
  );
}
