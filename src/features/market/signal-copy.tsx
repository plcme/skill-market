import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { formatChange, formatCount, formatPp, formatShare } from '@/lib/market/format';
import type { Signal } from '@/lib/market/types';
import { GLYPH_SLOT, signDirection, WithGlyph } from '@/components/market/direction-glyph';

/** One-line, absolute-number description of what moved (FR-D3); the change carries ▲/▼/■. */
export function useSignalMove() {
  const t = useTranslations('InstrumentPage');
  return function signalMove(signal: Signal): ReactNode {
    const dir = signDirection(signal.magnitude);
    const text = signal.kind === 'entry_open'
      ? t('signalMove.entry_open', { from: formatShare(signal.from), to: formatShare(signal.to), pp: `${GLYPH_SLOT}${formatPp(signal.magnitude)}` })
      : t('signalMove.count', { from: formatCount(signal.from), to: formatCount(signal.to), change: `${GLYPH_SLOT}${formatChange(signal.magnitude)}` });
    return <WithGlyph text={text} dir={dir} />;
  };
}
