import { METRICS } from '@/lib/metrics/registry';
import type { MetricReading } from './types';

// Number formatting. Pure and locale-aware so server and client render the same.

const LOCALE = 'en-AU';
const MINUS = '−';

export function formatCount(n: number): string {
  return new Intl.NumberFormat(LOCALE).format(Math.round(n));
}

export function formatShare(v: number): string {
  const pct = v * 100;
  const digits = pct >= 10 ? 1 : pct >= 1 ? 1 : 2;
  return `${pct.toFixed(digits)}%`;
}

export function signed(text: string, value: number): string {
  if (value > 0) return `+${text}`;
  if (value < 0) return `${MINUS}${text.replace('-', '')}`;
  return text;
}

export function formatChange(v: number): string {
  const pct = Math.abs(v * 100);
  const text = `${pct >= 10 ? pct.toFixed(0) : pct.toFixed(1)}%`;
  return signed(text, v);
}

export function formatPp(v: number): string {
  return signed(`${Math.abs(v * 100).toFixed(1)}`, v);
}

export function formatAud(n: number, compact = true): string {
  if (compact) return `$${Math.round(n / 1000)}k`;
  return new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n);
}

export type Direction = 'up' | 'down' | 'flat';

export function direction(v: number | null, flatBand = 0.02): Direction {
  if (v === null || Math.abs(v) < flatBand) return 'flat';
  return v > 0 ? 'up' : 'down';
}

/** The headline figure for a reading, or null when there is no trustworthy value. */
export function primaryValue(r: MetricReading): string | null {
  if (r.status !== 'ok' || r.value === null) return null;
  switch (METRICS[r.metric].unit) {
    case 'count':
      return formatCount(r.value);
    case 'share':
      return formatShare(r.value);
    case 'change':
      return formatChange(r.value);
    case 'aud':
      return formatAud(r.value);
    case 'aud_range':
      return r.low !== null && r.high !== null ? `${formatAud(r.low)}–${formatAud(r.high)}` : null;
    case 'employers':
      return formatCount(r.value);
    case 'premium':
      return formatChange(r.value);
    case 'ratio':
      return r.value.toFixed(0);
    case 'cv':
      return r.value.toFixed(2);
  }
}

/** Sort key for boards (higher first); insufficient samples sink to the bottom. */
export function sortValue(r: MetricReading): number {
  if (r.status !== 'ok' || r.value === null) return Number.NEGATIVE_INFINITY;
  return r.value;
}
