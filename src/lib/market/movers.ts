import type { MetricReading } from './types';

// Selection rule for the landing "signals" carousel (stated in visible copy):
// the largest absolute 4-week change — up or down — among instruments whose
// base count (ads in the earlier 4 weeks) is at least the minimum sample.

export interface MoverCandidate {
  slug: string;
  change: MetricReading;
}

export function isEligibleMover(change: MetricReading): boolean {
  return change.metric === 'change_4w'
    && change.status === 'ok'
    && change.value !== null
    && Number.isFinite(change.value)
    && change.from !== null
    && change.from >= change.min_sample;
}

/** Eligible candidates, biggest |relative change| first; ties by larger base, then slug. */
export function pickMovers<T extends MoverCandidate>(candidates: readonly T[], limit: number): T[] {
  return candidates
    .filter(c => isEligibleMover(c.change))
    .sort((a, b) =>
      Math.abs(b.change.value ?? 0) - Math.abs(a.change.value ?? 0)
      || (b.change.from ?? 0) - (a.change.from ?? 0)
      || a.slug.localeCompare(b.slug))
    .slice(0, Math.max(0, limit));
}
