import Fuse from 'fuse.js';

export const MAX_SEARCH_LENGTH = 80;
export type SearchFieldKind = 'name' | 'alias' | 'symbol' | 'code';
export type MatchKind = 'exact' | 'prefix' | 'substring' | 'fuzzy';
export interface SearchField { text: string; kind: SearchFieldKind; fuzzy?: boolean }
export interface SearchMatch<T> { item: T; matched: string; field: SearchFieldKind; kind: MatchKind; rank: number; score: number }

export function normalizeSearch(q: string): string {
  return q.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Literal matching always precedes fuzzy matching, including for technical names. */
export function createSearch<T>(items: readonly T[], fields: (item: T) => SearchField[]) {
  const records = items.flatMap((item, index) => fields(item).map(field => ({ item, index, ...field, value: normalizeSearch(field.text) })));
  const fuzzy = new Fuse(records.filter(r => r.fuzzy !== false && r.kind !== 'symbol' && r.kind !== 'code'), {
    keys: ['value'], includeScore: true, ignoreLocation: true, ignoreFieldNorm: true, threshold: 0.34,
  });
  const exactRank = { name: 0, code: 1, symbol: 1, alias: 2 };
  return (q: string, options: { limit?: number; accept?: (item: T) => boolean; fuzzy?: boolean } = {}): SearchMatch<T>[] => {
    const needle = normalizeSearch(q);
    if (!needle || needle.length > MAX_SEARCH_LENGTH) return [];
    const hits = new Map<number, SearchMatch<T>>();
    const keep = (index: number, hit: SearchMatch<T>) => {
      if (options.accept && !options.accept(hit.item)) return;
      const prev = hits.get(index);
      if (!prev || hit.rank < prev.rank || (hit.rank === prev.rank && hit.score < prev.score)) hits.set(index, hit);
    };
    for (const r of records) {
      const kind = r.value === needle ? 'exact' : r.value.startsWith(needle) ? 'prefix' : r.value.includes(needle) ? 'substring' : null;
      if (kind) keep(r.index, { item: r.item, matched: r.text, field: r.kind, kind, rank: kind === 'exact' ? exactRank[r.kind] : kind === 'prefix' ? 3 + (r.kind === 'alias' ? 1 : 0) : 5 + (r.kind === 'alias' ? 1 : 0), score: 0 });
    }
    if (options.fuzzy !== false) {
      // Every word must match. Short abbreviations and numeric codes stay literal.
      const terms = [...new Set(needle.split(/[\s-]+/).filter(Boolean))];
      let candidates: Map<number, SearchMatch<T>> | undefined;
      for (const term of terms) {
        const matches = new Map<number, SearchMatch<T>>();
        const allowTypos = /^\p{L}{4,}$/u.test(term);
        // Bitap counts a swapped pair as two edits. Match one literal swap
        // separately so six-letter words do not need a broad two-error budget.
        const swaps = allowTypos ? Array.from({ length: term.length - 1 }, (_, i) => term.slice(0, i) + term[i + 1] + term[i] + term.slice(i + 2)) : [];
        for (const r of records) {
          const literal = r.value.includes(term);
          const swap = !literal && r.fuzzy !== false && r.kind !== 'symbol' && r.kind !== 'code' && swaps.some(s => r.value.includes(s));
          if (literal || swap) {
            const score = literal ? 0 : 1 / term.length;
            if (!matches.has(r.index) || score < matches.get(r.index)!.score) matches.set(r.index, { item: r.item, matched: r.text, field: r.kind, kind: 'fuzzy', rank: 7, score });
          }
        }
        if (allowTypos) {
          const threshold = (term.length < 9 ? 1 : 2) / term.length;
          for (const { item: r, score = 1 } of fuzzy.search(term)) {
            if (score > threshold) continue;
            const prev = matches.get(r.index);
            if (!prev || score < prev.score) matches.set(r.index, { item: r.item, matched: r.text, field: r.kind, kind: 'fuzzy', rank: 7, score });
          }
        }
        if (!candidates) candidates = matches;
        else for (const [index, hit] of candidates) {
          const next = matches.get(index);
          if (!next) candidates.delete(index);
          else candidates.set(index, { ...hit, score: hit.score + next.score });
        }
        if (!candidates.size) break;
      }
      for (const [index, hit] of candidates ?? []) keep(index, hit);
    }
    return [...hits.entries()].sort(([ai, a], [bi, b]) => a.rank - b.rank || a.score - b.score || ai - bi)
      .slice(0, options.limit === undefined ? undefined : Math.max(0, options.limit)).map(([, hit]) => hit);
  };
}
