import { describe, expect, it } from 'vitest';
import { ALL_AUSTRALIA_ID, LOCATIONS, PICKABLE_LOCATIONS, narrowedPlaces, placesOrAllAustralia } from '../src/lib/filters/locations';
import { DEFAULT_FILTER } from '../src/lib/filters/spec';

describe('locations (Australia only)', () => {
  it('has Australia as the single country and root', () => {
    expect(LOCATIONS.filter(l => l.level === 'country').map(l => l.id)).toEqual([ALL_AUSTRALIA_ID]);
    expect(LOCATIONS.filter(l => l.parent_id === null).map(l => l.id)).toEqual([ALL_AUSTRALIA_ID]);
    expect(LOCATIONS.some(l => l.id.startsWith('nz'))).toBe(false);
  });

  it('the picker lists states, cities and regions but never a country', () => {
    expect(PICKABLE_LOCATIONS.length).toBe(LOCATIONS.length - 1);
    expect(PICKABLE_LOCATIONS.some(l => l.level === 'country')).toBe(false);
    expect(PICKABLE_LOCATIONS.map(l => l.id)).toContain('au-nsw');
    expect(PICKABLE_LOCATIONS.map(l => l.id)).toContain('au-nsw-sydney-cbd');
  });

  it('treats no narrower place as all of Australia, matching DEFAULT_FILTER', () => {
    expect(placesOrAllAustralia([])).toEqual(DEFAULT_FILTER.rules[0].location_ids);
    expect(placesOrAllAustralia(['au'])).toEqual(['au']);
    expect(placesOrAllAustralia(['au-nsw', 'au-vic-melbourne'])).toEqual(['au-nsw', 'au-vic-melbourne']);
    expect(narrowedPlaces(['au'])).toEqual([]);
    expect(narrowedPlaces(['au-qld'])).toEqual(['au-qld']);
  });
});
