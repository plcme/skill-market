import type { MetricReading } from '@/lib/market/types';

export interface DemandShare {
  /** Whose count this is — always named next to the figure (PRD §10.1). */
  name: string;
  share: number;
  denominator: number;
}

/**
 * The numeric "share of ads" line under Demand's definition. Only when the
 * definition belongs to one named instrument; column heads and section
 * headers (no subject) get the generic explanation instead.
 */
export function demandShare(reading: MetricReading | undefined, subject: string | undefined): DemandShare | null {
  if (!subject || !reading || reading.metric !== 'ad_count' || reading.status !== 'ok') return null;
  if (reading.numerator === null || !reading.denominator) return null;
  return { name: subject, share: reading.numerator / reading.denominator, denominator: reading.denominator };
}
