import { useTranslations } from 'next-intl';
import { METRICS } from '@/lib/metrics/registry';
import { formatCount, formatShare, primaryValue } from '@/lib/market/format';
import type { MetricReading } from '@/lib/market/types';
import { cn } from '@/lib/utils';
import { ChangeBadge } from './change-badge';

/** Secondary line that says what the number is out of (FR-D2: no bare percentages). */
export function useMetricDetail() {
  const t = useTranslations('Format');
  return (r: MetricReading): string | null => {
    if (r.status === 'insufficient_sample') return t('insufficientDetail', { n: formatCount(r.sample_n), min: r.min_sample });
    if (r.status === 'unavailable' || r.value === null) return t('unavailableDetail');
    switch (METRICS[r.metric].unit) {
      case 'share':
        return r.numerator !== null && r.denominator !== null ? t('ofAds', { num: formatCount(r.numerator), den: formatCount(r.denominator) }) : null;
      case 'count':
        return t('inWindow', { days: r.window.days });
      case 'change':
        return r.from !== null && r.to !== null ? t('changeAbs', { from: formatCount(r.from), to: formatCount(r.to) }) : null;
      case 'employers':
        return r.high !== null ? t('top5', { share: formatShare(r.high) }) : null;
      case 'aud':
      case 'aud_range':
        return r.numerator !== null && r.denominator !== null ? t('ofAds', { num: formatCount(r.numerator), den: formatCount(r.denominator) }) : null;
      case 'premium':
        return t('premium', { sign: r.value >= 0 ? '+' : '−', value: `${Math.abs(r.value * 100).toFixed(0)}%` });
      case 'ratio':
        return t('skillsPerAd', { n: r.value.toFixed(0) });
      case 'cv':
        return t('cv', { value: r.value.toFixed(2) });
    }
  };
}

export function MetricValue({ reading, size = 'md', showDetail = true, className }: {
  reading: MetricReading;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showDetail?: boolean;
  className?: string;
}) {
  const t = useTranslations('Format');
  const detail = useMetricDetail();
  const unit = METRICS[reading.metric].unit;
  if (unit === 'change' && reading.status === 'ok') {
    return <ChangeBadge reading={reading} size={size === 'sm' ? 'sm' : size === 'md' ? 'md' : 'lg'} showAbsolute={showDetail} className={className} />;
  }
  const value = primaryValue(reading);
  const line = showDetail ? detail(reading) : null;
  return (
    <span className={cn('inline-flex min-w-0 max-w-full flex-col gap-0.5', className)}>
      {value !== null ? (
        <span
          className={cn(
            size === 'sm' && 'num text-sm font-medium',
            size === 'md' && 'num text-[15px] font-medium',
            size === 'lg' && 'serif-num text-[34px] leading-none',
            size === 'xl' && 'serif-num text-[56px] leading-[0.95] sm:text-[72px]',
          )}
        >
          {value}
        </span>
      ) : (
        <span className={cn('text-muted', size === 'lg' || size === 'xl' ? 'font-serif text-2xl' : 'text-[13px]')}>
          {t(reading.status === 'unavailable' ? 'unavailable' : 'insufficient')}
        </span>
      )}
      {line ? (
        // Figures' detail stays on one line (ellipsis in narrow columns); an
        // explanation of a missing number wraps so it's never cut off.
        <span className={cn('num max-w-full text-[12px] leading-snug text-muted', value !== null ? 'truncate' : 'text-pretty')} title={line}>{line}</span>
      ) : null}
    </span>
  );
}
