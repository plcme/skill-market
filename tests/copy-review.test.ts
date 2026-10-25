import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadMessages } from '@/i18n/messages';
import {
  activationFromSearch,
  exportDecisions,
  groupItems,
  messageAt,
  parseDecisions,
  REVIEW_ITEM_IDS,
  REVIEW_ITEMS,
  reviewedCount,
  STORAGE_KEY,
  withDecision,
} from '@/features/dev/copy-review-store';

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

describe('copy review catalogue (FE-R9)', () => {
  const ROOT = join(__dirname, '..', 'src');
  const files = (dir: string): string[] => readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) && !path.includes(`${join('features', 'dev')}`) ? [path] : [];
  });
  /** Ids written in src: literal `onboarding.*` / `auth.*` strings, and `reviewId="x"` expanded to its three parts. */
  const usedIds = () => {
    const ids = new Set<string>();
    for (const file of files(ROOT)) {
      const source = readFileSync(file, 'utf8');
      for (const m of source.matchAll(/reviewId="([\w.]+)"/g)) for (const part of ['Badge', 'Confidence', 'Reason']) ids.add(`${m[1]}${part}`);
      for (const m of source.matchAll(/(?<!reviewId=)['"]((?:onboarding|auth)\.[a-z]\w*\.[\w.]+)['"]/g)) ids.add(m[1]);
    }
    return ids;
  };

  it('uses a new storage key so FE-R5 decisions do not bleed in', () => {
    expect(STORAGE_KEY).toBe('copy-review-v2');
  });

  it('has unique ids, each pointing at a real message', async () => {
    const messages = await loadMessages('en');
    expect(new Set(REVIEW_ITEMS.map(i => i.id)).size).toBe(REVIEW_ITEMS.length);
    for (const it of REVIEW_ITEMS) expect(messageAt(messages, it.source), it.source).not.toBeNull();
  });

  it('matches the ids wrapped in src one to one', () => {
    const used = usedIds();
    expect([...used].filter(id => !REVIEW_ITEM_IDS.has(id))).toEqual([]);
    expect(REVIEW_ITEMS.map(i => i.id).filter(id => !used.has(id))).toEqual([]);
  });

  it('groups in catalogue order and exports with the group', () => {
    const groups = groupItems(REVIEW_ITEMS);
    expect(groups[0].group).toBe('Onboarding · Basics');
    expect(groups.flatMap(g => g.items)).toHaveLength(REVIEW_ITEMS.length);
    const all = withDecision(withDecision({}, 'auth.login.free', { decision: 'delete' }), 'onboarding.basics.lede', { decision: 'info' });
    expect(Object.keys(exportDecisions(all))).toEqual(['onboarding.basics.lede', 'auth.login.free']);
    expect(exportDecisions(all)['auth.login.free'].group).toBe('Sign in');
  });

  it('resolves message templates by path', () => {
    expect(messageAt({ A: { b: 'x', c: { d: 'y' } } }, 'A.c.d')).toBe('y');
    expect(messageAt({ A: { b: 'x' } }, 'A.missing')).toBeNull();
    expect(messageAt({ A: { b: 'x' } }, 'A')).toBeNull();
  });
});
