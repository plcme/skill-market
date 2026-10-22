import { describe, expect, it } from 'vitest';
import { activationFromSearch, parseDecisions, reviewedCount, withDecision } from '@/features/dev/copy-review-store';

describe('copy review store', () => {
  it('turns on with ?review=copy, off with ?review=off, otherwise keeps the session state', () => {
    expect(activationFromSearch('?review=copy', false)).toBe(true);
    expect(activationFromSearch('?metric=ad_count&review=copy', false)).toBe(true);
    expect(activationFromSearch('?review=off', true)).toBe(false);
    expect(activationFromSearch('', true)).toBe(true);
    expect(activationFromSearch('?review=other', false)).toBe(false);
  });

  it('parses stored decisions defensively', () => {
    expect(parseDecisions(null)).toEqual({});
    expect(parseDecisions('not json')).toEqual({});
    expect(parseDecisions('[1]')).toEqual({});
    expect(parseDecisions(JSON.stringify({ a: { decision: 'delete', note: 'x', text: 't', page: '/' }, b: { decision: 'nope' }, c: 3 }))).toEqual({
      a: { decision: 'delete', note: 'x', text: 't', page: '/' },
      b: { decision: null, note: '', text: '', page: '' },
    });
  });

  it('sets, updates and removes empty entries', () => {
    let all = withDecision({}, 'x', { decision: 'info', text: 'Hello', page: '/market' });
    expect(all.x).toEqual({ decision: 'info', note: '', text: 'Hello', page: '/market' });
    all = withDecision(all, 'x', { note: 'shorter' });
    expect(all.x.note).toBe('shorter');
    all = withDecision(all, 'x', { decision: null, note: '' });
    expect(all).toEqual({});
  });

  it('counts reviewed ids on screen', () => {
    const all = withDecision(withDecision({}, 'a', { decision: 'keep' }), 'b', { note: 'only a note' });
    expect(reviewedCount(['a', 'b', 'c', 'a'], all)).toEqual({ done: 1, total: 3 });
  });
});
