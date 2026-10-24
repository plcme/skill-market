import { beforeEach, describe, expect, it } from 'vitest';
import { getDB, resetPreview, setPersona, transact } from '../src/lib/demo/store';
import { addWatchlistItem, MAX_WATCHLIST_ITEMS, watchAllItems } from '../src/lib/api/watchlist';
import { DEFAULT_FILTER } from '../src/lib/filters/spec';

beforeEach(() => resetPreview());

describe('watch all related targets', () => {
  it('requires a student session and makes no changes when signed out', async () => {
    const result = await watchAllItems({ slugs: ['python'], filter: DEFAULT_FILTER });
    expect(!result.ok && result.error.code).toBe('unauthenticated');
    expect(getDB().watchlist).toEqual([]);
  });

  it.each([['python', 'sql'], ['data-analyst', 'data-scientist']])('adds both kinds of collection: %s, %s', async (first, second) => {
    setPersona('student');
    const result = await watchAllItems({ slugs: [first, second, first], filter: DEFAULT_FILTER });
    expect(result).toEqual({ ok: true, data: { added: 2 } });
    expect(getDB().watchlist.map(item => item.instrument_slug)).toEqual([first, second]);
    expect(getDB().watchlist.every(item => item.status === 'watching' && item.baseline_at)).toBe(true);
    expect(await watchAllItems({ slugs: [first, second], filter: DEFAULT_FILTER })).toEqual({ ok: true, data: { added: 0 } });
  });

  it('preserves existing held items and their baselines', async () => {
    setPersona('student');
    await addWatchlistItem({ instrument_slug: 'python', status: 'held', filter: DEFAULT_FILTER });
    const existing = structuredClone(getDB().watchlist[0]);
    await watchAllItems({ slugs: ['python', 'sql'], filter: DEFAULT_FILTER });
    expect(getDB().watchlist.find(item => item.instrument_slug === 'python')).toEqual(existing);
  });

  it('keeps the current filter and treats other filter scopes separately', async () => {
    setPersona('student');
    await watchAllItems({ slugs: ['python'], filter: DEFAULT_FILTER });
    const filter = { ...DEFAULT_FILTER, seniority: 'entry' as const };
    const result = await watchAllItems({ slugs: ['python'], filter });
    expect(result.ok).toBe(true);
    expect(getDB().watchlist).toHaveLength(2);
    expect(getDB().watchlist[0].filter.seniority).toBe('entry');
  });

  it('rejects an invalid target without adding the valid ones', async () => {
    setPersona('student');
    expect((await watchAllItems({ slugs: ['python', 'unknown-target'], filter: DEFAULT_FILTER })).ok).toBe(false);
    expect(getDB().watchlist).toEqual([]);
  });

  it('rejects the whole batch when capacity is insufficient', async () => {
    setPersona('student');
    await addWatchlistItem({ instrument_slug: 'sql', status: 'held', filter: DEFAULT_FILTER });
    transact(d => { d.watchlist = Array.from({ length: MAX_WATCHLIST_ITEMS - 1 }, (_, index) => ({ ...d.watchlist[0], id: `existing-${index}` })); });
    const before = structuredClone(getDB().watchlist);
    const result = await watchAllItems({ slugs: ['python', 'data-analyst'], filter: DEFAULT_FILTER });
    expect(!result.ok && result.error.message).toBe('watchlistFull');
    expect(getDB().watchlist).toEqual(before);
  });
});
