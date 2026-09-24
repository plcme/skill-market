import { encodeFilter, isDefaultFilter } from '@/lib/filters/spec';
import type { FilterSpec, SignalKind } from '@/lib/market/types';

// Cross-area URL builders so every "talk to someone" entry carries the same context (FR-C1).

export function instrumentPath(type: 'skill' | 'role', slug: string, filter?: FilterSpec): string {
  const base = type === 'skill' ? `/s/${slug}` : `/r/${slug}`;
  return filter && !isDefaultFilter(filter) ? `${base}?f=${encodeFilter(filter)}` : base;
}

/** `/chat/new?instrument=<slug>&f=<filter>&signal=<kind>` */
export function chatHref(slug: string, filter?: FilterSpec, signal?: SignalKind | null): string {
  const q = new URLSearchParams({ instrument: slug });
  if (filter && !isDefaultFilter(filter)) q.set('f', encodeFilter(filter));
  if (signal) q.set('signal', signal);
  return `/chat/new?${q.toString()}`;
}

export function loginHref(next: string): string {
  return `/auth/login?next=${encodeURIComponent(next)}`;
}
