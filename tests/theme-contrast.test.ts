import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

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
