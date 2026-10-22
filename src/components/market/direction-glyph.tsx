import { Fragment } from 'react';
import { useTranslations } from 'next-intl';
import type { Direction } from '@/lib/market/format';
import { cn } from '@/lib/utils';

// Every signed change carries a direction glyph next to the number, so the
// direction never rests on colour alone (NFR-3) — whatever up/down colour
// scheme the person picked.

export const DIRECTION_GLYPH: Record<Direction, string> = { up: '▲', down: '▼', flat: '■' };

/** Direction from the sign alone: positive up, negative down, zero flat. */
export function signDirection(v: number): Direction {
  return v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
}

/**
 * ▲ / ▼ / ■ (hidden from screen readers) plus an sr-only direction word.
 * Pass `spoken={false}` when an enclosing aria-label already says up or down.
 */
export function DirectionGlyph({ dir, spoken = true, className }: { dir: Direction; spoken?: boolean; className?: string }) {
  return (
    <>
      <span aria-hidden className={cn('text-[0.7em]', className)}>{DIRECTION_GLYPH[dir]}</span>
      {spoken ? <DirectionWord dir={dir} /> : null}
    </>
  );
}

function DirectionWord({ dir }: { dir: Direction }) {
  const t = useTranslations('Format');
  return <span className="sr-only">{t(dir)}</span>;
}

/** Placeholder put into a translated sentence where the glyph should go. */
export const GLYPH_SLOT = '⁣';

/**
 * Renders a translated string with a DirectionGlyph wherever GLYPH_SLOT was
 * passed in as part of a value — for messages that interpolate a change.
 */
export function WithGlyph({ text, dir }: { text: string; dir: Direction }) {
  const parts = text.split(GLYPH_SLOT);
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>
          {i > 0 ? <><DirectionGlyph dir={dir} />{' '}</> : null}
          {part}
        </Fragment>
      ))}
    </>
  );
}
