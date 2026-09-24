import { useTranslations } from 'next-intl';
import { direction, formatChange, formatCount } from '@/lib/market/format';
import type { MetricReading } from '@/lib/market/types';
import { cn } from '@/lib/utils';

const GLYPH = { up: '▲', down: '▼', flat: '■' } as const;

/**
 * A change is always shown with its absolute counts (FR-D3) and with glyph +
 * words + colour, never colour alone (NFR-3).
 */
export function ChangeBadge({ reading, size = 'md', showAbsolute = true, className }: {
  reading: MetricReading;
  size?: 'sm' | 'md' | 'lg';
  showAbsolute?: boolean;
  className?: string;
}) {
  const t = useTranslations('Format');
  if (reading.status !== 'ok' || reading.value === null) {
    return <span className={cn('text-[13px] text-muted', className)}>{t(reading.status === 'unavailable' ? 'unavailable' : 'insufficient')}</span>;
  }
  const dir = direction(reading.value);
  const abs = reading.from !== null && reading.to !== null ? t('changeAbs', { from: formatCount(reading.from), to: formatCount(reading.to) }) : null;
  return (
    <span className={cn('inline-flex flex-col gap-0.5', className)}>
      <span
        className={cn(
          'num inline-flex items-center gap-1 font-medium',
          size === 'sm' && 'text-[13px]',
          size === 'md' && 'text-sm',
          size === 'lg' && 'text-lg',
          dir === 'up' && 'text-up',
          dir === 'down' && 'text-down',
          dir === 'flat' && 'text-muted',
        )}
      >
        <span aria-hidden className="text-[0.7em]">{GLYPH[dir]}</span>
        <span className="sr-only">{t(dir)}</span>
        {formatChange(reading.value)}
      </span>
      {showAbsolute && abs ? <span className="num whitespace-nowrap text-[12px] text-muted">{abs}</span> : null}
    </span>
  );
}
