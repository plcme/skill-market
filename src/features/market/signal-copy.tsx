import { useTranslations } from 'next-intl';
import { formatChange, formatCount, formatPp, formatShare } from '@/lib/market/format';
import type { Signal } from '@/lib/market/types';

/** One-line, absolute-number description of what moved (FR-D3). */
export function useSignalMove() {
  const t = useTranslations('InstrumentPage');
  return (signal: Signal): string => {
    if (signal.kind === 'entry_open') {
      return t('signalMove.entry_open', { from: formatShare(signal.from), to: formatShare(signal.to), pp: formatPp(signal.magnitude) });
    }
    return t('signalMove.count', { from: formatCount(signal.from), to: formatCount(signal.to), change: formatChange(signal.magnitude) });
  };
}
