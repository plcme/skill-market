'use client';

import { z } from 'zod';
import { computeMetric, detectSignal } from '@/lib/market/engine';
import { getInstrument } from '@/lib/market/catalog';
import { filterSpecSchema, normaliseFilter, sameFilter } from '@/lib/filters/spec';
import { isValidMetric, defaultMetric } from '@/lib/metrics/registry';
import type { FilterSpec, MetricKey, MetricReading, Signal } from '@/lib/market/types';
import { fail, guard, latency, ok } from './client';
import type { DemoDB, Result, WatchStatus, WatchlistItem } from './types';
import { transact, uid } from '@/lib/demo/store';

// Watchlist domain (FR-W1–W3, FR-F6). Server Actions: addWatchlistItem,
// updateWatchlistItem, removeWatchlistItem. Reads: selectWatchlist.

export const MAX_WATCHLIST_ITEMS = 30;

export const addWatchlistInput = z.object({
  instrument_slug: z.string().min(1),
  status: z.enum(['held', 'watching']),
  filter: filterSpecSchema,
  metric: z.string().optional(),
});
export type AddWatchlistInput = z.infer<typeof addWatchlistInput>;

export const updateWatchlistInput = z.object({
  id: z.string().min(1),
  status: z.enum(['held', 'watching']).optional(),
  filter: filterSpecSchema.optional(),
  metric: z.string().optional(),
});
export type UpdateWatchlistInput = z.infer<typeof updateWatchlistInput>;

export async function addWatchlistItem(input: AddWatchlistInput): Promise<Result<WatchlistItem>> {
  await latency();
  const parsed = addWatchlistInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation');
  const inst = getInstrument(parsed.data.instrument_slug);
  if (!inst) return fail('not_found', 'instrumentNotFound');
  if (inst.type !== 'skill' && parsed.data.status === 'held') return fail('validation', 'rolesCannotBeHeld');
  const metric: MetricKey = parsed.data.metric && isValidMetric(inst.type, parsed.data.metric) ? parsed.data.metric : defaultMetric(inst.type);
  const filter = normaliseFilter(parsed.data.filter as FilterSpec);
  return transact((d, now) => {
    const denied = guard(d, 'student');
    if (denied) return { ok: false, error: denied };
    const existing = d.watchlist.find(w => w.instrument_slug === inst.slug && sameFilter(w.filter, filter));
    if (existing) return fail('conflict', 'alreadyWatching');
    if (d.watchlist.length >= MAX_WATCHLIST_ITEMS) return fail('validation', 'watchlistFull');
    const iso = new Date(now).toISOString();
    const item: WatchlistItem = {
      id: uid('w'),
      instrument_slug: inst.slug,
      status: parsed.data.status,
      filter,
      metric,
      baseline_value: computeMetric(inst.slug, metric, filter).value,
      baseline_at: iso,
      created_at: iso,
    };
    d.watchlist.unshift(item);
    return ok(item);
  });
}

export async function updateWatchlistItem(input: UpdateWatchlistInput): Promise<Result<WatchlistItem>> {
  await latency();
  const parsed = updateWatchlistInput.safeParse(input);
  if (!parsed.success) return fail('validation', 'validation');
  return transact((d, now) => {
    const denied = guard(d, 'student');
    if (denied) return { ok: false, error: denied };
    const item = d.watchlist.find(w => w.id === parsed.data.id);
    if (!item) return fail('not_found', 'notFound');
    const inst = getInstrument(item.instrument_slug);
    if (parsed.data.status) {
      if (inst && inst.type !== 'skill' && parsed.data.status === 'held') return fail('validation', 'rolesCannotBeHeld');
      item.status = parsed.data.status as WatchStatus;
    }
    let rebaseline = false;
    if (parsed.data.filter) {
      const next = normaliseFilter(parsed.data.filter as FilterSpec);
      if (d.watchlist.some(w => w.id !== item.id && w.instrument_slug === item.instrument_slug && sameFilter(w.filter, next))) return fail('conflict', 'alreadyWatching');
      if (!sameFilter(next, item.filter)) rebaseline = true;
      item.filter = next;
    }
    if (parsed.data.metric && inst && isValidMetric(inst.type, parsed.data.metric) && parsed.data.metric !== item.metric) {
      item.metric = parsed.data.metric;
      rebaseline = true;
    }
    if (rebaseline) {
      // A different filter or measure is a different thing to track: restart "since added".
      item.baseline_value = computeMetric(item.instrument_slug, item.metric, item.filter).value;
      item.baseline_at = new Date(now).toISOString();
    }
    return ok(item);
  });
}

export async function removeWatchlistItem(id: string): Promise<Result<{ id: string }>> {
  await latency();
  return transact(d => {
    const denied = guard(d, 'student');
    if (denied) return { ok: false, error: denied };
    const before = d.watchlist.length;
    d.watchlist = d.watchlist.filter(w => w.id !== id);
    return before === d.watchlist.length ? fail('not_found', 'notFound') : ok({ id });
  });
}

export interface WatchlistRow {
  item: WatchlistItem;
  current: MetricReading;
  /** Relative change since the item was added (FR-W2). */
  since_added: number | null;
  signal: Signal | null;
}

export const SINCE_ADDED_THRESHOLD = 0.25;

/** Read model for the watchlist with live values, "since added" and signals (FR-W2, FR-W3). */
export function selectWatchlist(d: DemoDB): WatchlistRow[] {
  return d.watchlist.map(item => {
    const current = computeMetric(item.instrument_slug, item.metric, item.filter);
    const since = current.value !== null && item.baseline_value ? (current.value - item.baseline_value) / Math.abs(item.baseline_value) : null;
    let signal = detectSignal(item.instrument_slug, item.filter);
    if (!signal && since !== null && Math.abs(since) >= SINCE_ADDED_THRESHOLD && item.baseline_value !== null && current.value !== null) {
      signal = {
        id: `sig:since:${item.id}`,
        kind: 'since_added',
        instrument_slug: item.instrument_slug,
        metric: item.metric,
        magnitude: since,
        from: item.baseline_value,
        to: current.value,
        detected_at: current.updated_at,
        filter: item.filter,
      };
    }
    return { item, current, since_added: since, signal };
  });
}

export function findWatchItem(d: DemoDB, slug: string, filter: FilterSpec): WatchlistItem | undefined {
  return d.watchlist.find(w => w.instrument_slug === slug && sameFilter(w.filter, filter));
}

/** Put a just-removed item back exactly as it was, baseline included (undo for remove). */
export async function restoreWatchlistItem(item: WatchlistItem): Promise<Result<WatchlistItem>> {
  await latency(40, 60);
  return transact(d => {
    const denied = guard(d, 'student');
    if (denied) return { ok: false, error: denied };
    if (d.watchlist.some(w => w.id === item.id || (w.instrument_slug === item.instrument_slug && sameFilter(w.filter, item.filter)))) return fail('conflict', 'alreadyWatching');
    if (d.watchlist.length >= MAX_WATCHLIST_ITEMS) return fail('validation', 'watchlistFull');
    d.watchlist.push(item);
    d.watchlist.sort((a, b) => b.created_at.localeCompare(a.created_at));
    return ok(item);
  });
}

/** Desk read model: signal rows first, then everything grouped Held / Watching (FR-W1–W3). */
export function selectWatchlistGroups(d: DemoDB): { signals: WatchlistRow[]; held: WatchlistRow[]; watching: WatchlistRow[] } {
  const rows = selectWatchlist(d);
  return {
    signals: rows.filter(r => r.signal),
    held: rows.filter(r => r.item.status === 'held'),
    watching: rows.filter(r => r.item.status === 'watching'),
  };
}
