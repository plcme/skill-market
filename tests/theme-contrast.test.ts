import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DEFAULT_MARKET_COLORS, MARKET_COLOR_SWATCHES, MARKET_COLORS, type MarketColors } from '../src/lib/market-colors';

// WCAG 1.4.11: chart series (and the faint "Not stated" bucket) need ≥ 3:1
// against the surface they're drawn on, in both themes. axe can't see SVG strokes.

const css = readFileSync(join(__dirname, '../src/styles/theme.css'), 'utf8');

function block(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  if (start < 0) throw new Error(`missing ${selector}`);
  const body = css.slice(start, css.indexOf('}', start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)].map(m => [m[1], m[2].toLowerCase()]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe('chart series contrast', () => {
  it('computes WCAG contrast correctly', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
  });

  for (const [theme, selector] of [['light', ':root'], ['dark', ':root[data-theme="dark"]']] as const) {
    it(`every --series-* and --faint is ≥ 3:1 against --surface (${theme})`, () => {
      const tokens = block(selector);
      const surface = tokens['--surface'];
      expect(surface).toBeDefined();
      const series = Object.keys(tokens).filter(k => k.startsWith('--series-'));
      expect(series.length).toBe(7);
      for (const key of [...series, '--faint']) {
        expect(contrast(tokens[key], surface), `${theme} ${key} ${tokens[key]} on ${surface}`).toBeGreaterThanOrEqual(3);
      }
    });
  }
});

// ---------------------------------------------------------------- up/down colour schemes
// Each market colour scheme × theme resolves tokens the way the cascade does:
// :root, then the dark block, then the scheme block, then the dark+scheme block.

const plain = css.replace(/\/\*[\s\S]*?\*\//g, '');

/** Every declaration in blocks whose selector is exactly `selector`, later blocks winning. */
function merged(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of plain.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (m[1].split(';').pop()?.trim() !== selector) continue;
    for (const d of m[2].matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6})\s*;/gi)) out[d[1]] = d[2].toLowerCase();
  }
  return out;
}

const SCHEMES = MARKET_COLORS;
const THEMES = ['light', 'dark'] as const;

function resolved(scheme: MarketColors, theme: 'light' | 'dark'): Record<string, string> {
  const layers = [merged(':root')];
  if (theme === 'dark') layers.push(merged(':root[data-theme="dark"]'));
  if (scheme !== DEFAULT_MARKET_COLORS) layers.push(merged(`:root[data-market-colors="${scheme}"]`));
  if (theme === 'dark' && scheme !== DEFAULT_MARKET_COLORS) layers.push(merged(`:root[data-theme="dark"][data-market-colors="${scheme}"]`));
  return Object.assign({}, ...layers);
}

const HEAT_BANDS = ['dn2', 'dn1', '0', 'up1', 'up2', 'na'] as const;

describe('market colour schemes', () => {
  it('defines a block for every non-default scheme in both themes', () => {
    for (const scheme of SCHEMES.filter(s => s !== DEFAULT_MARKET_COLORS)) {
      expect(Object.keys(merged(`:root[data-market-colors="${scheme}"]`)).length).toBeGreaterThan(0);
      expect(Object.keys(merged(`:root[data-theme="dark"][data-market-colors="${scheme}"]`)).length).toBeGreaterThan(0);
    }
  });

  for (const scheme of SCHEMES) {
    for (const theme of THEMES) {
      describe(`${scheme} / ${theme}`, () => {
        const tk = resolved(scheme, theme);
        it('up and down text are ≥ 4.5:1 on paper and surface, and on their soft tints', () => {
          for (const key of ['--up', '--down']) {
            for (const bg of ['--paper', '--surface', `${key}-soft`]) {
              expect(contrast(tk[key], tk[bg]), `${key} ${tk[key]} on ${bg} ${tk[bg]}`).toBeGreaterThanOrEqual(4.5);
            }
            expect(contrast(tk['--ink'], tk[`${key}-soft`]), `ink on ${key}-soft`).toBeGreaterThanOrEqual(4.5);
          }
        });
        it('every heat band keeps its own text at ≥ 4.5:1', () => {
          for (const band of HEAT_BANDS) {
            const bg = tk[`--heat-${band}`];
            const ink = tk[`--heat-${band}-ink`];
            expect(contrast(bg, ink), `heat-${band} ${bg} / ${ink}`).toBeGreaterThanOrEqual(4.5);
          }
        });
        it('the picked Statistics cell keeps its text and large up/down figures readable', () => {
          const bg = tk['--picked'];
          expect(bg).toBeDefined();
          for (const key of ['--ink', '--ink-2', '--muted']) expect(contrast(tk[key], bg), `${key} on picked`).toBeGreaterThanOrEqual(4.5);
          for (const key of ['--up', '--down']) expect(contrast(tk[key], bg), `${key} on picked`).toBeGreaterThanOrEqual(3);
          expect(contrast(tk['--ink'], tk['--surface']), 'ink border on surface').toBeGreaterThanOrEqual(3);
        });
        it('the ticker tape colours are ≥ 4.5:1 on the night surface', () => {
          for (const key of ['--tape-up', '--tape-down']) expect(contrast(tk[key], tk['--night']), key).toBeGreaterThanOrEqual(4.5);
        });
        it('status colours and selection stay readable', () => {
          for (const key of ['--danger', '--success', '--warn']) {
            expect(contrast(tk[key], tk['--paper']), `${key} on paper`).toBeGreaterThanOrEqual(4.5);
            expect(contrast(tk[key], tk[`${key}-soft`]), `${key} on ${key}-soft`).toBeGreaterThanOrEqual(4.5);
          }
          expect(contrast(tk['--selection'], tk['--selection-ink'])).toBeGreaterThanOrEqual(4.5);
        });
        it('the settings preview swatches match the tokens', () => {
          expect(MARKET_COLOR_SWATCHES[scheme][theme]).toEqual({ up: tk['--up'], down: tk['--down'] });
        });
      });
    }
  }

  it('status colours never change with the scheme', () => {
    for (const theme of THEMES) {
      const base = resolved(DEFAULT_MARKET_COLORS, theme);
      for (const scheme of SCHEMES) {
        const tk = resolved(scheme, theme);
        for (const key of ['--danger', '--danger-soft', '--success', '--success-soft', '--warn', '--warn-soft']) expect(tk[key]).toBe(base[key]);
      }
    }
  });

  it('red-up is green-up with the meaning swapped', () => {
    for (const theme of THEMES) {
      const g = resolved('green-up', theme);
      const r = resolved('red-up', theme);
      for (const [a, b] of [['--up', '--down'], ['--up-soft', '--down-soft'], ['--heat-up2', '--heat-dn2'], ['--heat-up1', '--heat-dn1'], ['--heat-up2-ink', '--heat-dn2-ink'], ['--heat-up1-ink', '--heat-dn1-ink'], ['--tape-up', '--tape-down']]) {
        expect(r[a]).toBe(g[b]);
        expect(r[b]).toBe(g[a]);
      }
    }
  });

  it('status icons on inverted (ink) toasts keep ≥ 3:1', () => {
    for (const theme of THEMES) {
      const tk = resolved(DEFAULT_MARKET_COLORS, theme);
      const onInk = merged(theme === 'dark' ? ':root[data-theme="dark"] .on-ink' : '.on-ink');
      for (const key of ['--success', '--warn']) expect(contrast(onInk[key], tk['--ink']), `${theme} ${key}`).toBeGreaterThanOrEqual(3);
    }
  });
});
