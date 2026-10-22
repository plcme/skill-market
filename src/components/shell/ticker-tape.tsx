'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { direction, formatChange, formatCount } from '@/lib/market/format';
import { cn } from '@/lib/utils';
import { DirectionGlyph } from '@/components/market/direction-glyph';
import { useUiMode } from '@/lib/demo/ui-mode';
import { AUTO_ADVANCE_QUERY, useMediaQuery } from '@/lib/hooks/use-media-query';

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

/**
 * Scrolling market strip. No pause button, so to meet WCAG 2.2.2 it follows
 * the home carousel's rule: it only moves where hover-to-pause works (fine
 * pointer with hover, no reduced-motion preference), pauses on hover or focus,
 * and stops for the session on any pointer or key interaction. Everywhere else
 * it is a static, horizontally scrollable strip.
 */
export function TickerTape({ items }: { items: TapeItem[] }) {
  const t = useTranslations('Nav');
  const [hold, setHold] = useState(false);
  const [stopped, setStopped] = useState(false);
  const canAnimate = useMediaQuery(AUTO_ADVANCE_QUERY);
  const animated = canAnimate && !stopped;
  const mode = useUiMode();
  if (!items.length || mode === 'plain') return null;
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map(it => {
        const dir = direction(it.change);
        return (
          <li key={`${hidden}-${it.slug}`} className="flex items-center">
            <Link href={it.href} tabIndex={hidden ? -1 : undefined} className="flex items-center gap-2 px-4 font-mono text-[11.5px] tracking-wide hover:bg-night-ink/10">
              <span className={cn('font-medium', it.signal && 'bg-signal px-1 text-signal-ink')}>{it.symbol}</span>
              <span className="text-night-ink/60">{it.name}</span>
              <span className={cn(dir === 'up' && 'text-tape-up', dir === 'down' && 'text-tape-down', dir === 'flat' && 'text-night-ink/70')}>
                <DirectionGlyph dir={dir} className="text-[1em]" /> {formatChange(it.change)}
              </span>
              <span className="text-night-ink/50">{formatCount(it.from)}→{formatCount(it.to)}</span>
            </Link>
            <span aria-hidden className="text-night-ink/25">·</span>
          </li>
        );
      })}
    </ul>
  );
  return (
    <div
      className={cn('no-print relative flex h-8 items-center bg-night text-night-ink', animated ? 'overflow-hidden' : 'overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden')}
      onPointerDown={() => setStopped(true)}
      onKeyDown={() => setStopped(true)}
      onMouseEnter={() => setHold(true)}
      onMouseLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHold(false); }}
    >
      <p className="sr-only">{t('tape')}</p>
      {animated ? (
        <div className={cn('flex w-max animate-tape motion-reduce:animate-none', hold && '[animation-play-state:paused]')}>
          {row(false)}
          {row(true)}
        </div>
      ) : (
        <div className="flex w-max">{row(false)}</div>
      )}
    </div>
  );
}
