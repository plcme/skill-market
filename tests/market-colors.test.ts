import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_MARKET_COLORS, MARKET_COLORS_KEY, MARKET_COLORS_SCRIPT, parseMarketColors } from '../src/lib/market-colors';
import { PREPAINT_SCRIPT } from '../src/lib/prepaint';

describe('market colours preference', () => {
  it('parses known schemes and falls back to green-up', () => {
    expect(DEFAULT_MARKET_COLORS).toBe('green-up');
    expect(parseMarketColors('green-up')).toBe('green-up');
    expect(parseMarketColors('red-up')).toBe('red-up');
    expect(parseMarketColors('blue-up')).toBe('blue-up');
    expect(parseMarketColors(null)).toBe('green-up');
    expect(parseMarketColors(undefined)).toBe('green-up');
    expect(parseMarketColors('')).toBe('green-up');
    expect(parseMarketColors('purple-up')).toBe('green-up');
    expect(parseMarketColors('RED-UP')).toBe('green-up');
  });

  it('pre-paint script puts the stored scheme on <html>, defaulting safely', () => {
    const run = (getItem: () => string | null) => {
      const html = { dataset: {} as Record<string, string> };
      new Function('localStorage', 'document', MARKET_COLORS_SCRIPT)({ getItem }, { documentElement: html });
      return html.dataset.marketColors;
    };
    expect(run(() => null)).toBe('green-up');
    expect(run(() => 'red-up')).toBe('red-up');
    expect(run(() => 'blue-up')).toBe('blue-up');
    expect(run(() => 'nonsense')).toBe('green-up');
    expect(run(() => { throw new Error('blocked'); })).toBe('green-up');
  });

  it('runs in the same pre-paint script as the theme without either breaking the other', () => {
    const html = { dataset: {} as Record<string, string> };
    const store: Record<string, string> = { 'sm-theme': 'dark', [MARKET_COLORS_KEY]: 'blue-up' };
    new Function('localStorage', 'matchMedia', 'document', PREPAINT_SCRIPT)(
      { getItem: (k: string) => store[k] ?? null },
      () => ({ matches: false }),
      { documentElement: html },
    );
    expect(html.dataset).toEqual({ theme: 'dark', marketColors: 'blue-up' });
  });
});

describe('market colours store', () => {
  let storage: Map<string, string>;
  let blocked: boolean;
  let html: { dataset: Record<string, string> };
  let win: EventTarget & { localStorage: Storage };

  beforeEach(() => {
    vi.resetModules();
    storage = new Map();
    blocked = false;
    html = { dataset: {} };
    const guard = () => { if (blocked) throw new Error('blocked'); };
    const localStorage = {
      getItem: (k: string) => { guard(); return storage.get(k) ?? null; },
      setItem: (k: string, v: string) => { guard(); storage.set(k, v); },
      removeItem: (k: string) => { guard(); storage.delete(k); },
    } as unknown as Storage;
    win = Object.assign(new EventTarget(), { localStorage });
    vi.stubGlobal('window', win);
    vi.stubGlobal('document', { documentElement: html });
  });
  afterEach(() => vi.unstubAllGlobals());

  const load = () => import('../src/lib/market-colors-store');

  it('reads the default when nothing is stored, and the stored scheme otherwise', async () => {
    const s = await load();
    expect(s.readMarketColors()).toBe('green-up');
    storage.set(MARKET_COLORS_KEY, 'red-up');
    expect(s.readMarketColors()).toBe('red-up');
    storage.set(MARKET_COLORS_KEY, 'junk');
    expect(s.readMarketColors()).toBe('green-up');
  });

  it('stores a choice, applies it to <html> and notifies subscribers', async () => {
    const s = await load();
    const onChange = vi.fn();
    const off = s.subscribeMarketColors(onChange);
    s.storeMarketColors('blue-up');
    expect(storage.get(MARKET_COLORS_KEY)).toBe('blue-up');
    expect(html.dataset.marketColors).toBe('blue-up');
    expect(onChange).toHaveBeenCalledTimes(1);
    // Choosing the default clears the stored value.
    s.storeMarketColors('green-up');
    expect(storage.has(MARKET_COLORS_KEY)).toBe(false);
    expect(html.dataset.marketColors).toBe('green-up');
    expect(onChange).toHaveBeenCalledTimes(2);
    off();
    s.storeMarketColors('red-up');
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('follows other tabs through storage events for its own key only', async () => {
    const s = await load();
    const onChange = vi.fn();
    s.subscribeMarketColors(onChange);
    const fire = (key: string | null) => win.dispatchEvent(Object.assign(new Event('storage'), { key }));
    fire('sm-theme');
    expect(onChange).not.toHaveBeenCalled();
    fire(MARKET_COLORS_KEY);
    fire(null); // storage.clear()
    expect(onChange).toHaveBeenCalledTimes(2);
    storage.set(MARKET_COLORS_KEY, 'red-up');
    s.applyMarketColors();
    expect(html.dataset.marketColors).toBe('red-up');
  });

  it('keeps a choice for the page view when storage is blocked', async () => {
    const s = await load();
    blocked = true;
    expect(s.readMarketColors()).toBe('green-up');
    expect(() => s.storeMarketColors('red-up')).not.toThrow();
    expect(s.readMarketColors()).toBe('red-up');
    expect(html.dataset.marketColors).toBe('red-up');
  });
});
