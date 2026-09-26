'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, ChevronLeft, ChevronRight, MessageCircle, Pause, Play } from 'lucide-react';
import { chatHref, instrumentPath } from '@/lib/links';
import { direction, formatChange, formatCount } from '@/lib/market/format';
import type { ActiveInstrumentType } from '@/lib/market/types';
import { Button } from '@/components/ui/button';
import { Monogram } from '@/components/ui/primitives';
import { Sparkline } from '@/components/market/sparkline';
import { cn } from '@/lib/utils';

// Landing "what moved" carousel: one main card plus the next three as smaller
// cards. Auto-advance is opt-out (pause button, hover/focus pauses) and never
// starts when the viewer prefers reduced motion.

export interface MoverItem {
  slug: string;
  type: ActiveInstrumentType;
  name: string;
  symbol: string;
  change: number;
  from: number;
  to: number;
  sparkline: number[];
  /** Minimum base count this mover had to clear (from its reading). */
  minSample: number;
}

const INTERVAL_MS = 8000;
const REDUCED_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeReducedMotion(cb: () => void): () => void {
  try {
    const mq = window.matchMedia(REDUCED_QUERY);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  } catch {
    return () => {};
  }
}

function readReducedMotion(): boolean {
  try {
    return window.matchMedia(REDUCED_QUERY).matches;
  } catch {
    return true;
  }
}

function useMoveLine() {
  const t = useTranslations('Home');
  return (m: MoverItem) => t('moverLine', {
    type: m.type,
    name: m.name,
    dir: m.change > 0 ? 'up' : m.change < 0 ? 'down' : 'flat',
    from: formatCount(m.from),
    to: formatCount(m.to),
  });
}

export function MoversCarousel({ items }: { items: MoverItem[] }) {
  const t = useTranslations('Home');
  const tt = useTranslations('Ticker');
  const line = useMoveLine();
  const [index, setIndex] = useState(0);
  // 'auto' follows prefers-reduced-motion; the button sets an explicit choice.
  const [mode, setMode] = useState<'auto' | 'playing' | 'paused'>('auto');
  const [hold, setHold] = useState(false);
  const reduced = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, () => true);
  const playing = mode === 'playing' || (mode === 'auto' && !reduced);
  const n = items.length;

  const go = useCallback((delta: number) => setIndex(i => (i + delta + n) % n), [n]);

  useEffect(() => {
    if (!playing || hold || n < 2) return;
    const id = window.setInterval(() => go(1), INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [playing, hold, n, go]);

  if (!n) return <p className="text-sm text-ink-2">{t('moversEmpty')}</p>;

  const main = items[index];
  const side = Array.from({ length: Math.min(3, n - 1) }, (_, k) => items[(index + 1 + k) % n]);

  return (
    <section
      aria-roledescription={t('carouselRole')}
      aria-label={t('moversLabel')}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false); }}
    >
      <div className="mb-3 flex items-center justify-end gap-1">
        <span className="num mr-2 text-[12.5px] text-muted" aria-hidden>{index + 1} / {n}</span>
        <Button variant="ghost" size="icon-sm" onClick={() => go(-1)} aria-label={t('moversPrev')}><ChevronLeft aria-hidden /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => go(1)} aria-label={t('moversNext')}><ChevronRight aria-hidden /></Button>
        <Button variant="ghost" size="icon-sm" onClick={() => setMode(playing ? 'paused' : 'playing')} aria-label={playing ? t('moversPause') : t('moversPlay')} aria-pressed={!playing}>
          {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <article
          key={main.slug}
          aria-roledescription={t('slideRole')}
          aria-label={t('slideLabel', { i: index + 1, n, name: main.name })}
          aria-live={playing && !hold ? 'off' : 'polite'}
          className="relative flex flex-col rounded-lg border border-rule bg-surface p-5 motion-safe:animate-fade sm:p-6"
        >
          <p className="kicker">{tt(main.type)}</p>
          <div className="mt-3 flex items-center gap-3">
            <Monogram size="sm">{main.symbol}</Monogram>
            <h3 className="min-w-0 font-serif text-[26px] leading-tight">{main.name}</h3>
          </div>
          <p className={cn('serif-num mt-4 text-[56px] leading-[0.9] sm:text-[64px]', main.change > 0 ? 'text-up' : main.change < 0 ? 'text-down' : 'text-ink')}>
            {formatChange(main.change)}
          </p>
          <p className="num mt-3 text-[14px] text-ink-2">{line(main)}</p>
          <div className="mt-4">
            <Sparkline values={main.sparkline} dir={direction(main.change)} label={tt('trend')} description={tt('trendDesc', { name: main.name, first: main.sparkline[0] ?? 0, last: main.sparkline[main.sparkline.length - 1] ?? 0 })} width={420} height={56} className="h-auto w-full" />
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-rule pt-4">
            <Button asChild variant="outline" size="sm"><Link href={instrumentPath(main.type, main.slug)}>{t('leadOpen', { name: main.name })}<ArrowUpRight aria-hidden /></Link></Button>
            <Button asChild variant="ghost" size="sm"><Link href={chatHref(main.slug)}><MessageCircle aria-hidden />{t('moverTalk')}</Link></Button>
          </div>
        </article>

        <ul className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
          {side.map(m => (
            <li key={m.slug} className="relative flex flex-col gap-1 rounded-md border border-rule bg-surface p-3 transition-colors hover:border-ink/30">
              <div className="flex items-center justify-between gap-2">
                <span className="kicker">{tt(m.type)}</span>
                <span className={cn('num text-[15px] font-medium', m.change > 0 ? 'text-up' : m.change < 0 ? 'text-down' : 'text-ink')}>{formatChange(m.change)}</span>
              </div>
              <Link href={instrumentPath(m.type, m.slug)} className="min-w-0 truncate font-medium after:absolute after:inset-0 after:rounded-md after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent">
                {m.name}
              </Link>
              <p className="num text-[12.5px] leading-snug text-ink-2">{line(m)}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
