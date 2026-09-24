'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pause, Play } from 'lucide-react';
import { formatChange, formatCount } from '@/lib/market/format';
import { cn } from '@/lib/utils';

export interface TapeItem {
  slug: string;
  href: string;
  symbol: string;
  name: string;
  change: number;
  from: number;
  to: number;
  signal: boolean;
}

/** Scrolling market strip. Pausable (WCAG 2.2.2) and static under reduced motion. */
export function TickerTape({ items }: { items: TapeItem[] }) {
  const t = useTranslations('Nav');
  const [paused, setPaused] = useState(false);
  if (!items.length) return null;
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map(it => {
        const up = it.change >= 0;
        return (
          <li key={`${hidden}-${it.slug}`} className="flex items-center">
            <Link href={it.href} tabIndex={hidden ? -1 : undefined} className="flex items-center gap-2 px-4 font-mono text-[11.5px] tracking-wide hover:bg-paper/10">
              <span className={cn('font-medium', it.signal && 'bg-signal px-1 text-signal-ink')}>{it.symbol}</span>
              <span className="text-paper/60">{it.name}</span>
              <span className={cn(up ? 'text-[#7fe0ae]' : 'text-[#ff9f86]')}>
                <span aria-hidden>{up ? '▲' : '▼'}</span> {formatChange(it.change)}
              </span>
              <span className="text-paper/50">{formatCount(it.from)}→{formatCount(it.to)}</span>
            </Link>
            <span aria-hidden className="text-paper/25">·</span>
          </li>
        );
      })}
    </ul>
  );
  return (
    <div className="no-print relative flex h-8 items-center overflow-hidden bg-ink text-paper">
      <p className="sr-only">{t('tape')}</p>
      <div className={cn('flex w-max animate-tape motion-reduce:animate-none', paused && '[animation-play-state:paused]')}>
        {row(false)}
        {row(true)}
      </div>
      <button
        type="button"
        onClick={() => setPaused(p => !p)}
        aria-label={paused ? t('tapePlay') : t('tapePause')}
        className="absolute inset-y-0 right-0 grid w-9 place-items-center bg-gradient-to-l from-ink via-ink to-transparent pl-2 text-paper/70 hover:text-paper motion-reduce:hidden"
      >
        {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
      </button>
    </div>
  );
}
