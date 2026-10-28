import { describe, expect, it } from 'vitest';
import { BOARD_CACHE_LIMIT, boardCacheSize, getBoard } from '@/lib/queries/market';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import type { FilterSpec } from '@/lib/market/types';
import type { SearchAlias } from '@/lib/market/catalog';

const slugs = (rows: { instrument: { slug: string } }[]) => rows.map(r => r.instrument.slug);
const QLD: FilterSpec = { ...DEFAULT_FILTER, rules: [{ work_modes: ['onsite', 'hybrid', 'remote'], location_ids: ['au-qld'] }] };

describe('board cache', () => {
  it('returns equal boards for repeated and equivalent queries', () => {
    const a = getBoard({ type: 'skill', filter: DEFAULT_FILTER, sort: 'change' });
    const b = getBoard({ type: 'skill', filter: DEFAULT_FILTER, sort: 'change' });
    expect(b).toEqual(a);
    // Whitespace and case in the name filter do not change the result.
    expect(getBoard({ type: 'all', filter: DEFAULT_FILTER, q: '  PYTHON ' })).toEqual(getBoard({ type: 'all', filter: DEFAULT_FILTER, q: 'python' }));
  });

  it('keys on every input that changes the board', () => {
    const base = getBoard({ type: 'skill', filter: DEFAULT_FILTER });
    expect(getBoard({ type: 'role', filter: DEFAULT_FILTER }).type).toBe('role');
    expect(getBoard({ type: 'skill', filter: DEFAULT_FILTER, metric: 'entry_level_share' }).metric).toBe('entry_level_share');
    expect(slugs(getBoard({ type: 'skill', filter: DEFAULT_FILTER, sort: 'change' }).rows)).not.toEqual(slugs(base.rows));
    expect(getBoard({ type: 'skill', filter: DEFAULT_FILTER, layer: 'technology_tool' }).rows.length).toBeLessThan(base.rows.length);
    expect(getBoard({ type: 'skill', filter: DEFAULT_FILTER, q: 'python' }).rows.length).toBeLessThan(base.rows.length);
    expect(getBoard({ type: 'skill', filter: QLD }).rows[0].metric.value).not.toBe(base.rows[0].metric.value);
  });

  it('caches boards built with different alias lists apart', () => {
    expect(getBoard({ type: 'skill', q: 'snaketool', filter: DEFAULT_FILTER }).rows).toEqual([]);
    const aliases: SearchAlias[] = [{ alias: 'snaketool', instrument_slug: 'python' }];
    expect(slugs(getBoard({ type: 'skill', q: 'snaketool', filter: DEFAULT_FILTER }, aliases).rows)).toEqual(['python']);
    const other: SearchAlias[] = [{ alias: 'snaketool', instrument_slug: 'rust' }];
    expect(slugs(getBoard({ type: 'skill', q: 'snaketool', filter: DEFAULT_FILTER }, other).rows)).toEqual(['rust']);
  });

  it('hands each caller its own rows array', () => {
    const a = getBoard({ type: 'industry', filter: DEFAULT_FILTER });
    const order = slugs(a.rows);
    a.rows.reverse();
    a.rows.pop();
    expect(slugs(getBoard({ type: 'industry', filter: DEFAULT_FILTER }).rows)).toEqual(order);
  });

  it('stays within its bound', () => {
    for (let i = 0; i < BOARD_CACHE_LIMIT + 50; i++) getBoard({ type: 'industry', filter: DEFAULT_FILTER, q: `zz-no-match-${i}` });
    expect(boardCacheSize()).toBe(BOARD_CACHE_LIMIT);
  });
});
