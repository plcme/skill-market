import { describe, expect, it } from 'vitest';
import { createSearch, MAX_SEARCH_LENGTH, normalizeSearch } from '@/lib/search/matcher';
import { INSTRUMENTS, searchInstruments } from '@/lib/market/catalog';
import { searchCompetencies, isExactCompetencyHit, competencyHref } from '@/lib/market/competencies';
import { COURSE_UNITS, searchUnits } from '@/lib/demo/education';
import { searchLocations } from '@/lib/search/locations';
import { createAliasSearch } from '@/lib/search/aliases';
import { getBoard, searchWithSnapshots } from '@/lib/queries/market';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import { createSeed } from '@/lib/demo/store';
import { aliasOwner, selectAliases } from '@/lib/api/admin';
import { watchedRows } from '@/features/market/logic';

const slugs = (q: string) => searchInstruments(q, INSTRUMENTS.length).map(h => h.instrument.slug);

describe('shared fuzzy matcher', () => {
  it('normalizes Unicode and whitespace without removing technical punctuation', () => {
    expect(normalizeSearch('  Ｃ++  ')).toBe('c++');
    expect(normalizeSearch(' Data   analysis ')).toBe('data analysis');
  });

  it.each([['pyhton', 'python'], ['javascrpt', 'javascript'], ['kubernets', 'kubernetes']])('recovers %s in the top three', (q, slug) => {
    expect(slugs(q).slice(0, 3)).toContain(slug);
  });

  it.each([['JS', 'javascript'], ['k8s', 'kubernetes'], ['r', 'statistics'], ['C++', 'cpp'], ['Python', 'python']])('preserves exact %s', (q, slug) => {
    expect(slugs(q)[0]).toBe(slug);
  });

  it('keeps exact, prefix and substring matches ahead of typos and deduplicates aliases', () => {
    const items = [{ name: 'Python', aliases: ['python', 'py'] }, { name: 'Pythonic', aliases: [] }, { name: 'Pyhton', aliases: [] }];
    const search = createSearch(items, i => [{ text: i.name, kind: 'name' }, ...i.aliases.map(text => ({ text, kind: 'alias' as const }))]);
    expect(search('python').map(h => h.item.name)).toEqual(['Python', 'Pythonic', 'Pyhton']);
  });

  it('requires every word, supports reversed word order, and keeps cross-field matches', () => {
    expect(slugs('enginer software')).toContain('software-engineer');
    expect(slugs('software zzzzzzz')).toEqual([]);
    expect(slugs('python zzzzzzz')).toEqual([]);
    const search = createSearch([{ name: 'Red', alias: 'cotton shirt' }, { name: 'Red dress', alias: '' }], i => [{ text: i.name, kind: 'name' }, { text: i.alias, kind: 'alias' }]);
    expect(search('shirt red').map(h => h.item.name)).toEqual(['Red']);
  });

  it('does not fuzzy-expand short abbreviations, punctuation or numeric identifiers', () => {
    const search = createSearch(['JS', 'C++', 'DATA2002'], text => [{ text, kind: 'name' }]);
    expect(search('JX')).toEqual([]);
    expect(search('C+++')).toEqual([]);
    expect(search('DATA2003')).toEqual([]);
    expect(slugs('pyhton')).not.toContain('pytorch');
  });

  it.each(['', '   ', 'zzzzzzzzzz', '\u6570\u636e\u5206\u6790', 'x'.repeat(MAX_SEARCH_LENGTH + 1)])('returns no invented results for %j', q => {
    expect(slugs(q)).toEqual([]);
  });

  it('applies domain restrictions and exclusions before the result limit', () => {
    const search = createSearch(Array.from({ length: 50 }, (_, id) => ({ id, name: 'Python', type: id < 49 ? 'role' : 'skill' })), i => [{ text: i.name, kind: 'name' }]);
    expect(search('pyhton', { limit: 1, accept: i => i.type === 'skill' }).map(h => h.item.id)).toEqual([49]);
    const hits = searchInstruments('data', 2, { type: 'role', exclude: new Set(['data-analyst']) });
    expect(hits).toHaveLength(2);
    expect(hits.every(h => h.instrument.type === 'role' && h.instrument.slug !== 'data-analyst')).toBe(true);
  });
});

describe('domain adapters', () => {
  it('keeps core competencies as explainers, including typos', () => {
    const exact = searchCompetencies('communication')[0];
    expect(isExactCompetencyHit(exact, 'Communication ')).toBe(true);
    const fuzzy = searchCompetencies('communciation')[0];
    expect(fuzzy.slug).toBe('oral-communication');
    expect(isExactCompetencyHit(fuzzy, 'communciation')).toBe(false);
    expect(competencyHref(fuzzy.slug)).toBe('/metrics#competency-oral-communication');
    expect(searchCompetencies('co')).toEqual([]);
  });

  it('scopes course titles by university and keeps numeric codes literal', () => {
    expect(searchUnits('usyd', 'progamming').map(u => u.code)).toContain('INFO1110');
    expect(searchUnits('unsw', 'progamming')).toEqual([]);
    expect(searchUnits('usyd', 'DATA 2002')).toEqual(searchUnits('usyd', 'DATA2002'));
    expect(searchUnits('usyd', 'DATA2003')).toEqual([]);
    expect(searchUnits('usyd', '')).toHaveLength(COURSE_UNITS.length);
  });

  it('finds misspelled places without adding a country or changing IDs', () => {
    expect(searchLocations('sydny')[0].id).toBe('au-nsw-sydney');
    expect(searchLocations('melborne')[0].id).toBe('au-vic-melbourne');
    expect(searchLocations('NSW')[0].id).toBe('au-nsw');
    expect(searchLocations('').every(l => l.level !== 'country')).toBe(true);
    expect(searchLocations('zzzzzzzz')).toEqual([]);
  });

  it('filters the board while preserving its metric order, skill layer and watched subset', () => {
    const all = getBoard({ type: 'all', filter: DEFAULT_FILTER, sort: 'change' });
    const board = getBoard({ type: 'all', filter: DEFAULT_FILTER, sort: 'change', q: 'pyhton' });
    const match = new Set(slugs('pyhton'));
    expect(board.rows.map(r => r.instrument.slug)).toEqual(all.rows.filter(r => match.has(r.instrument.slug)).map(r => r.instrument.slug));
    expect(watchedRows(board.rows, new Set(['python'])).map(r => r.instrument.slug)).toEqual(['python']);
    const tasks = getBoard({ type: 'skill', layer: 'specialist_task', filter: DEFAULT_FILTER, q: 'pyhton' });
    expect(tasks.rows.every(r => r.instrument.skill_layer === 'specialist_task')).toBe(true);
    expect(tasks.rows.some(r => r.instrument.slug === 'python')).toBe(false);
  });

  it('returns correct grouped snapshots for typo searches', () => {
    const result = searchWithSnapshots('pyhton', DEFAULT_FILTER);
    expect(result.skills[0].hit.instrument.slug).toBe('python');
    expect(result.skills[0].snapshot.instrument.slug).toBe('python');
    expect(result.roles.every(r => r.hit.instrument.type === 'role')).toBe(true);
    expect(result.industries.every(r => r.hit.instrument.type === 'industry')).toBe(true);
  });
});

describe('browser-scoped alias overrides', () => {
  it('adds, updates and removes aliases without changing the public index', () => {
    const a = [{ alias: 'snaketool', instrument_slug: 'python' }];
    const b = [{ alias: 'snaketool', instrument_slug: 'rust' }];
    expect(searchInstruments('snaketool', 1, { aliases: a })[0].instrument.slug).toBe('python');
    expect(searchInstruments('snaketol', 1, { aliases: a })[0].instrument.slug).toBe('python');
    expect(searchInstruments('snaketool', 1, { aliases: b })[0].instrument.slug).toBe('rust');
    expect(searchInstruments('snaketool', 1, { aliases: [] })).toEqual([]);
    expect(searchWithSnapshots('snaketool', DEFAULT_FILTER, a).skills[0].hit.instrument.slug).toBe('python');
    expect(getBoard({ type: 'skill', q: 'snaketool', filter: DEFAULT_FILTER }, a).rows[0].instrument.slug).toBe('python');
    expect(searchInstruments('snaketool')).toEqual([]);
  });

  it('keeps admin filtering literal by default and labels opted-in approximate results separately', () => {
    const db = createSeed();
    const search = createAliasSearch(selectAliases(db));
    expect(search('javascrpt').exact).toEqual([]);
    expect(search('javascrpt').similar).toEqual([]);
    expect(search('javascrpt', true).similar.some(r => r.instrument_slug === 'javascript')).toBe(true);
    expect(search('js', true).exact.some(r => r.alias === 'js')).toBe(true);
    expect(aliasOwner(db, 'javascrpt')).toBeNull();
    expect(aliasOwner(db, 'JS')).toBe('javascript');
  });
});
