import type { AliasRow } from '@/lib/api/admin';
import { getInstrument } from '@/lib/market/catalog';
import { createSearch, normalizeSearch } from './matcher';

export function createAliasSearch(rows: readonly AliasRow[]) {
  const search = createSearch(rows, r => [
    { text: r.alias, kind: 'alias' }, { text: getInstrument(r.instrument_slug)?.name ?? r.instrument_slug, kind: 'name' },
  ]);
  return (q: string, includeSimilar = false) => {
    if (!normalizeSearch(q)) return { exact: [...rows], similar: [] as AliasRow[] };
    const hits = search(q, { fuzzy: includeSimilar });
    return {
      exact: hits.filter(h => h.kind !== 'fuzzy').map(h => h.item),
      similar: hits.filter(h => h.kind === 'fuzzy').map(h => h.item),
    };
  };
}
