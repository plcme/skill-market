import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTER, decodeFilter, describeFilter, encodeFilter, expandFilterToCells, normaliseFilter, type FilterCopy,
} from '../src/lib/filters/spec';
import { leafIdsFor, normaliseLocationIds } from '../src/lib/filters/locations';
import messages from '../messages/en/market.json';
import type { FilterSpec } from '../src/lib/market/types';

const copy = messages.Filter.readback as FilterCopy;

const compound: FilterSpec = {
  rules: [
    { work_modes: ['onsite'], location_ids: ['au-nsw-sydney', 'au-vic-melbourne'] },
    { work_modes: ['remote'], location_ids: ['au', 'nz'] },
  ],
  seniority: 'entry',
  work_rights: 'no_pr_required',
};

describe('filter spec', () => {
  it('round-trips through the URL codec', () => {
    const encoded = encodeFilter(compound);
    expect(encoded).toMatch(/^[A-Za-z0-9.*_-]+$/);
    expect(decodeFilter(encoded)).toEqual(normaliseFilter(compound));
  });

  it('falls back to the single default rule (FR-F2)', () => {
    expect(decodeFilter(null)).toEqual(DEFAULT_FILTER);
    expect(decodeFilter('garbage')).toEqual(normaliseFilter(DEFAULT_FILTER));
    expect(DEFAULT_FILTER.rules).toHaveLength(1);
  });

  it('expands any level to leaves and unions rules without double counting (FR-F1, FR-F4)', () => {
    expect(leafIdsFor('au-nsw-sydney')).toEqual(['au-nsw-sydney-cbd', 'au-nsw-sydney-north', 'au-nsw-sydney-west']);
    const overlapping: FilterSpec = { ...compound, rules: [{ work_modes: ['remote'], location_ids: ['au'] }, { work_modes: ['remote'], location_ids: ['au-nsw-sydney'] }] };
    const cells = expandFilterToCells(overlapping);
    expect(cells.pairs).toHaveLength(leafIdsFor('au').length);
    expect(expandFilterToCells(compound).seniority).toEqual(['graduate', 'entry_other']);
    expect(expandFilterToCells(compound).rights).toEqual(['not_stated', 'sponsorship_ok']);
  });

  it('drops a location already covered by a selected ancestor', () => {
    expect(normaliseLocationIds(['au', 'au-nsw-sydney', 'unknown'])).toEqual(['au']);
  });

  it('reads every filter back in plain English (FR-F3)', () => {
    expect(describeFilter(compound, copy)).toBe(
      'Showing on-site roles in Sydney or Melbourne, plus remote roles in Australia or New Zealand · Entry-level only · No PR or citizenship requirement stated',
    );
    expect(describeFilter(DEFAULT_FILTER, copy)).toBe('Showing all roles in Australia · All levels');
  });
});
