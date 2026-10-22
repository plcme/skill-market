import { beforeEach, describe, expect, it } from 'vitest';
import { getDB, resetPreview, setPersona } from '../src/lib/demo/store';
import { addWatchlistItem, canBeHeld, selectWatchlistGroups, updateWatchlistItem } from '../src/lib/api/watchlist';
import { DEFAULT_FILTER } from '../src/lib/filters/spec';
import { dismissedRoles } from '../src/features/market/role-practitioner-nudge';

beforeEach(() => resetPreview());

describe('held roles ("I’ve worked in this role")', () => {
  it('skills and roles can be held, industries only watched', () => {
    expect(canBeHeld('skill')).toBe(true);
    expect(canBeHeld('role')).toBe(true);
    expect(canBeHeld('industry')).toBe(false);
  });

  it('adds a held role and groups it apart from skills I have', async () => {
    setPersona('student');
    expect((await addWatchlistItem({ instrument_slug: 'data-analyst', status: 'held', filter: DEFAULT_FILTER })).ok).toBe(true);
    expect((await addWatchlistItem({ instrument_slug: 'sql', status: 'held', filter: DEFAULT_FILTER })).ok).toBe(true);
    const groups = selectWatchlistGroups(getDB());
    expect(groups.worked.map(r => r.item.instrument_slug)).toEqual(['data-analyst']);
    expect(groups.held.map(r => r.item.instrument_slug)).toEqual(['sql']);
  });

  it('rejects held industries on add and update', async () => {
    setPersona('student');
    const add = await addWatchlistItem({ instrument_slug: 'mining', status: 'held', filter: DEFAULT_FILTER });
    expect(!add.ok && add.error.message).toBe('industriesCannotBeHeld');
    const watched = await addWatchlistItem({ instrument_slug: 'mining', status: 'watching', filter: DEFAULT_FILTER });
    expect(watched.ok).toBe(true);
    if (watched.ok) {
      const upd = await updateWatchlistItem({ id: watched.data.id, status: 'held' });
      expect(!upd.ok && upd.error.message).toBe('industriesCannotBeHeld');
    }
  });

  it('reads remembered nudge dismissals defensively', () => {
    expect(dismissedRoles('["data-analyst",3]')).toEqual(['data-analyst']);
    expect(dismissedRoles('nope')).toEqual([]);
    expect(dismissedRoles('{}')).toEqual([]);
  });
});
