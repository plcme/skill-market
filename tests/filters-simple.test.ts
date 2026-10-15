import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTER, decodeFilter, describeFilter, encodeFilter, expandFilterToCells, fromSimpleFilter, isRemoteAnywhereRule, normaliseFilter,
  remoteAnywhereRedundant, REMOTE_ANYWHERE_RULE, sameFilter, toSimpleFilter, type FilterCopy,
} from '../src/lib/filters/spec';
import messages from '../messages/en/market.json';
import type { FilterSpec } from '../src/lib/market/types';

const copy = messages.Filter.readback as FilterCopy;
const base = { seniority: 'all', work_rights: 'all' } as const;

describe('simple filter controls (places × modes + remote anywhere)', () => {
  it('reads the national default as simple, switch off', () => {
    expect(toSimpleFilter(DEFAULT_FILTER)).toEqual({ places: ['au'], modes: ['onsite', 'hybrid', 'remote'], includeRemoteAnywhere: false });
  });

  it('round-trips with the switch on and off', () => {
    for (const includeRemoteAnywhere of [true, false]) {
      const simple = { places: ['au-nsw-sydney'], modes: ['onsite', 'hybrid'] as FilterSpec['rules'][0]['work_modes'], includeRemoteAnywhere };
      const spec = fromSimpleFilter(simple, { seniority: 'entry', work_rights: 'no_pr_required' });
      expect(spec.rules).toHaveLength(includeRemoteAnywhere ? 2 : 1);
      expect(spec.seniority).toBe('entry');
      expect(toSimpleFilter(spec)).toEqual(simple);
      // Survives the URL codec too.
      expect(toSimpleFilter(decodeFilter(encodeFilter(spec)))).toEqual(simple);
    }
  });

  it('the switch is presence of the remote-anywhere rule', () => {
    const on = fromSimpleFilter({ places: ['au-vic'], modes: ['onsite'], includeRemoteAnywhere: true }, base);
    expect(on.rules[1]).toEqual(REMOTE_ANYWHERE_RULE);
    expect(isRemoteAnywhereRule(on.rules[1])).toBe(true);
    expect(isRemoteAnywhereRule(on.rules[0])).toBe(false);
    const cellsOn = expandFilterToCells(on).pairs.length;
    const cellsOff = expandFilterToCells(fromSimpleFilter({ places: ['au-vic'], modes: ['onsite'], includeRemoteAnywhere: false }, base)).pairs.length;
    expect(cellsOn).toBeGreaterThan(cellsOff);
  });

  it('a redundant switch adds nothing', () => {
    expect(remoteAnywhereRedundant(['au'], ['remote'])).toBe(true);
    expect(remoteAnywhereRedundant(['au', 'au-nsw'], ['onsite', 'remote'])).toBe(true);
    expect(remoteAnywhereRedundant(['au-nsw'], ['remote'])).toBe(false);
    expect(remoteAnywhereRedundant(['au'], ['onsite', 'hybrid'])).toBe(false);
    const spec = fromSimpleFilter({ places: ['au'], modes: ['onsite', 'remote'], includeRemoteAnywhere: true }, base);
    expect(spec.rules).toHaveLength(1);
    // A URL carrying a redundant extra rule still opens in simple mode (switch reads off).
    const redundantUrl = decodeFilter('ohr.au*r.au_all_all');
    expect(toSimpleFilter(redundantUrl)).toEqual({ places: ['au'], modes: ['onsite', 'hybrid', 'remote'], includeRemoteAnywhere: false });
  });

  it('the remote rule can come first in a URL', () => {
    expect(toSimpleFilter(decodeFilter('r.au*o.au-qld_all_all'))).toEqual({ places: ['au-qld'], modes: ['onsite'], includeRemoteAnywhere: true });
  });

  it('returns null for specs the simple controls cannot express', () => {
    const twoPlaces: FilterSpec = { rules: [{ work_modes: ['onsite'], location_ids: ['au-nsw-sydney'] }, { work_modes: ['hybrid'], location_ids: ['au-vic'] }], ...base };
    expect(toSimpleFilter(twoPlaces)).toBeNull();
    const remoteNz: FilterSpec = { rules: [{ work_modes: ['onsite'], location_ids: ['au-nsw'] }, { work_modes: ['remote'], location_ids: ['nz'] }], ...base };
    expect(toSimpleFilter(remoteNz)).toBeNull();
    const three = decodeFilter('o.au-nsw*h.au-vic*r.au_all_all');
    expect(toSimpleFilter(three)).toBeNull();
  });

  it('keeps the spec shape backward compatible', () => {
    const spec = fromSimpleFilter({ places: ['au-nsw-sydney'], modes: ['onsite', 'hybrid'], includeRemoteAnywhere: true }, base);
    expect(encodeFilter(spec)).toBe('oh.au-nsw-sydney*r.au_all_all');
    expect(sameFilter(normaliseFilter(spec), decodeFilter('oh.au-nsw-sydney*r.au_all_all'))).toBe(true);
  });

  it('reads back the remote add-on in plain English', () => {
    const spec = fromSimpleFilter({ places: ['au-nsw-sydney'], modes: ['onsite', 'hybrid'], includeRemoteAnywhere: true }, base);
    expect(describeFilter(spec, copy)).toBe('Showing on-site or hybrid roles in Sydney, plus remote roles anywhere in Australia · All levels');
    // A lone remote-in-Australia rule is not an add-on.
    expect(describeFilter(decodeFilter('r.au_all_all'), copy)).toBe('Showing remote roles in Australia · All levels');
  });
});
