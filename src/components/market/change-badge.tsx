import { useTranslations } from 'next-intl';
import { direction, formatChange, formatCount } from '@/lib/market/format';
import type { MetricReading } from '@/lib/market/types';
import { cn } from '@/lib/utils';
import { DecodeText } from '@/components/motion/decode-text';
import { DirectionGlyph } from './direction-glyph';

/**
 * A change is always shown with its absolute counts (FR-D3) and with glyph +
 * words + colour, never colour alone (NFR-3).
 */
export function ChangeBadge({ reading, size = 'md', showAbsolute = true, decodeDelay, className }: {
  reading: MetricReading;
  size?: 'sm' | 'md' | 'lg';
  showAbsolute?: boolean;
  decodeDelay?: number;
  className?: string;
}) {
  const t = useTranslations('Format');
  if (reading.status !== 'ok' || reading.value === null) {
    return <span className={cn('text-[13px] text-muted', className)}>{t(reading.status === 'unavailable' ? 'unavailable' : 'insufficient')}</span>;
  }
  const dir = direction(reading.value);
  const abs = reading.from !== null && reading.to !== null ? t('changeAbs', { from: formatCount(reading.from), to: formatCount(reading.to) }) : null;
  return (
    <span className={cn('inline-flex min-w-0 max-w-full flex-col gap-0.5', className)}>
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
        <DirectionGlyph dir={dir} />
        {decodeDelay !== undefined ? <DecodeText value={formatChange(reading.value)} delay={decodeDelay} /> : formatChange(reading.value)}
      </span>
      {showAbsolute && abs ? <span className="num max-w-full truncate text-[12px] text-muted" title={abs}>{abs}</span> : null}
    </span>
  );
}
