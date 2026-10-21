import type { ResolvedTheme } from './theme';

// Up/down colour scheme (Settings → Display). A per-device display preference,
// like the theme: stored in localStorage and put on html[data-market-colors]
// before first paint. Only CSS tokens read it (src/styles/theme.css); arrows
// and signs carry direction regardless of the scheme.

export const MARKET_COLORS = ['green-up', 'red-up', 'blue-up'] as const;
export type MarketColors = (typeof MARKET_COLORS)[number];

export const DEFAULT_MARKET_COLORS: MarketColors = 'green-up';
export const MARKET_COLORS_KEY = 'sm-market-colors';

/** Stored value → scheme; anything unknown falls back to the default. */
export function parseMarketColors(v: string | null | undefined): MarketColors {
  return (MARKET_COLORS as readonly string[]).includes(v ?? '') ? (v as MarketColors) : DEFAULT_MARKET_COLORS;
}

/**
 * Up/down swatches for the settings preview. Mirrors the `--up`/`--down`
 * tokens in theme.css (a unit test keeps them in sync); the preview has to
 * show every scheme at once, so it can't read the live tokens.
 */
export const MARKET_COLOR_SWATCHES: Record<MarketColors, Record<ResolvedTheme, { up: string; down: string }>> = {
  'green-up': { light: { up: '#0b7a34', down: '#c62828' }, dark: { up: '#22c55e', down: '#f25a52' } },
  'red-up': { light: { up: '#c62828', down: '#0b7a34' }, dark: { up: '#f25a52', down: '#22c55e' } },
  'blue-up': { light: { up: '#1f5fa8', down: '#a84a14' }, dark: { up: '#7fb0f0', down: '#f09a5c' } },
};

/** Resolves the scheme before first paint (inlined in <head> right after THEME_SCRIPT). */
export const MARKET_COLORS_SCRIPT = `(function(){var s='${DEFAULT_MARKET_COLORS}';try{var v=localStorage.getItem('${MARKET_COLORS_KEY}');if(${MARKET_COLORS.filter(m => m !== DEFAULT_MARKET_COLORS).map(m => `v==='${m}'`).join('||')})s=v}catch(e){}document.documentElement.dataset.marketColors=s})()`;
