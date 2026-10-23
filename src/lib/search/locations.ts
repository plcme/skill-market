import { PICKABLE_LOCATIONS } from '@/lib/filters/locations';
import { createSearch, normalizeSearch } from './matcher';

const search = createSearch(PICKABLE_LOCATIONS, l => [
  { text: l.name, kind: 'name' }, { text: l.short, kind: 'symbol', fuzzy: false },
]);
export function searchLocations(q: string) {
  return normalizeSearch(q) ? search(q).map(h => h.item) : [...PICKABLE_LOCATIONS];
}
