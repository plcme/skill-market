import { describe, expect, it } from 'vitest';
import { paletteSuggestions, SUGGESTED } from '@/components/shell/command-palette';
import { searchInstruments } from '@/lib/market/catalog';

describe('command palette suggestions', () => {
  it('lists the same instruments as a direct search of each suggestion', () => {
    const expected = SUGGESTED.flatMap(s => searchInstruments(s, 1)).map(h => h.instrument.slug);
    expect(paletteSuggestions().map(i => i.id)).toEqual(expected);
    expect(expected).toEqual(['rust', 'dbt', 'data-analyst', 'terraform', 'cybersecurity', 'software-engineer']);
  });

  it('builds the list once and reuses it', () => {
    const first = paletteSuggestions();
    expect(paletteSuggestions()).toBe(first);
    expect(first.every(i => i.kind === 'instrument' && i.hit.instrument.slug === i.id)).toBe(true);
  });
});
