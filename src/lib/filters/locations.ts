import type { Location } from '@/lib/market/types';

// Location tree: country → state → city → region (FR-F4). Any level is selectable;
// leaves are the atoms that ads are assigned to (ARCHITECTURE §6.3).
export const LOCATIONS: readonly Location[] = [
  { id: 'au', name: 'Australia', short: 'AU', level: 'country', parent_id: null },
  { id: 'au-nsw', name: 'New South Wales', short: 'NSW', level: 'state', parent_id: 'au' },
  { id: 'au-nsw-sydney', name: 'Sydney', short: 'Sydney', level: 'city', parent_id: 'au-nsw' },
  { id: 'au-nsw-sydney-cbd', name: 'Sydney CBD', short: 'Sydney CBD', level: 'region', parent_id: 'au-nsw-sydney' },
  { id: 'au-nsw-sydney-north', name: 'North Sydney & Macquarie Park', short: 'North Sydney', level: 'region', parent_id: 'au-nsw-sydney' },
  { id: 'au-nsw-sydney-west', name: 'Parramatta & Western Sydney', short: 'Parramatta', level: 'region', parent_id: 'au-nsw-sydney' },
  { id: 'au-nsw-newcastle', name: 'Newcastle', short: 'Newcastle', level: 'city', parent_id: 'au-nsw' },
  { id: 'au-nsw-wollongong', name: 'Wollongong', short: 'Wollongong', level: 'city', parent_id: 'au-nsw' },
  { id: 'au-vic', name: 'Victoria', short: 'VIC', level: 'state', parent_id: 'au' },
  { id: 'au-vic-melbourne', name: 'Melbourne', short: 'Melbourne', level: 'city', parent_id: 'au-vic' },
  { id: 'au-vic-melbourne-cbd', name: 'Melbourne CBD & Docklands', short: 'Melbourne CBD', level: 'region', parent_id: 'au-vic-melbourne' },
  { id: 'au-vic-melbourne-south', name: 'Southbank & South Melbourne', short: 'Southbank', level: 'region', parent_id: 'au-vic-melbourne' },
  { id: 'au-vic-melbourne-east', name: 'Eastern suburbs (Box Hill, Clayton)', short: 'Melbourne East', level: 'region', parent_id: 'au-vic-melbourne' },
  { id: 'au-vic-geelong', name: 'Geelong', short: 'Geelong', level: 'city', parent_id: 'au-vic' },
  { id: 'au-qld', name: 'Queensland', short: 'QLD', level: 'state', parent_id: 'au' },
  { id: 'au-qld-brisbane', name: 'Brisbane', short: 'Brisbane', level: 'city', parent_id: 'au-qld' },
  { id: 'au-qld-goldcoast', name: 'Gold Coast', short: 'Gold Coast', level: 'city', parent_id: 'au-qld' },
  { id: 'au-wa', name: 'Western Australia', short: 'WA', level: 'state', parent_id: 'au' },
  { id: 'au-wa-perth', name: 'Perth', short: 'Perth', level: 'city', parent_id: 'au-wa' },
  { id: 'au-sa', name: 'South Australia', short: 'SA', level: 'state', parent_id: 'au' },
  { id: 'au-sa-adelaide', name: 'Adelaide', short: 'Adelaide', level: 'city', parent_id: 'au-sa' },
  { id: 'au-act', name: 'Australian Capital Territory', short: 'ACT', level: 'state', parent_id: 'au' },
  { id: 'au-act-canberra', name: 'Canberra', short: 'Canberra', level: 'city', parent_id: 'au-act' },
  { id: 'au-tas', name: 'Tasmania', short: 'TAS', level: 'state', parent_id: 'au' },
  { id: 'au-tas-hobart', name: 'Hobart', short: 'Hobart', level: 'city', parent_id: 'au-tas' },
  { id: 'au-nt', name: 'Northern Territory', short: 'NT', level: 'state', parent_id: 'au' },
  { id: 'au-nt-darwin', name: 'Darwin', short: 'Darwin', level: 'city', parent_id: 'au-nt' },
  { id: 'nz', name: 'New Zealand', short: 'NZ', level: 'country', parent_id: null },
  { id: 'nz-auckland', name: 'Auckland', short: 'Auckland', level: 'city', parent_id: 'nz' },
  { id: 'nz-wellington', name: 'Wellington', short: 'Wellington', level: 'city', parent_id: 'nz' },
];

const byId = new Map(LOCATIONS.map(l => [l.id, l]));
const childrenOf = new Map<string, Location[]>();
for (const l of LOCATIONS) {
  if (!l.parent_id) continue;
  const list = childrenOf.get(l.parent_id) ?? [];
  list.push(l);
  childrenOf.set(l.parent_id, list);
}

export function getLocation(id: string): Location | undefined {
  return byId.get(id);
}

export function locationChildren(id: string | null): Location[] {
  if (id === null) return LOCATIONS.filter(l => l.parent_id === null);
  return childrenOf.get(id) ?? [];
}

export function isLeaf(id: string): boolean {
  return (childrenOf.get(id)?.length ?? 0) === 0;
}

/** All leaf ids under a location (itself when it is a leaf). Unknown ids expand to nothing. */
export function leafIdsFor(id: string): string[] {
  if (!byId.has(id)) return [];
  const kids = childrenOf.get(id);
  if (!kids?.length) return [id];
  return kids.flatMap(k => leafIdsFor(k.id));
}

export const LEAF_IDS: readonly string[] = LOCATIONS.filter(l => isLeaf(l.id)).map(l => l.id);

/** Ancestors from the root down, excluding the location itself. */
export function ancestorsOf(id: string): Location[] {
  const out: Location[] = [];
  let cur = byId.get(id)?.parent_id ?? null;
  while (cur) {
    const loc = byId.get(cur);
    if (!loc) break;
    out.unshift(loc);
    cur = loc.parent_id;
  }
  return out;
}

/** Collapse a selection so no id is listed together with one of its ancestors. */
export function normaliseLocationIds(ids: string[]): string[] {
  const known = [...new Set(ids)].filter(id => byId.has(id));
  const set = new Set(known);
  return known.filter(id => !ancestorsOf(id).some(a => set.has(a.id)));
}

/** State-level id for a location (used by matching "based in" factor). */
export function stateOf(id: string): string | null {
  const loc = byId.get(id);
  if (!loc) return null;
  if (loc.level === 'state' || loc.level === 'country') return loc.id;
  const chain = ancestorsOf(id);
  return chain.find(a => a.level === 'state')?.id ?? chain[0]?.id ?? null;
}
