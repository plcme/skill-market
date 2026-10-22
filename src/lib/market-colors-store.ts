import { DEFAULT_MARKET_COLORS, MARKET_COLORS_KEY, parseMarketColors, type MarketColors } from './market-colors';

// Browser-side store for the up/down colour scheme, mirroring theme-store.ts:
// localStorage + html[data-market-colors] (set before paint by
// MARKET_COLORS_SCRIPT), not React context.

const CHANGE_EVENT = 'sm:market-colors';

/** A choice that couldn't be written (storage blocked); it lasts for this page view only. */
let unsaved: MarketColors | null = null;

export function readMarketColors(): MarketColors {
  try {
    const stored = parseMarketColors(window.localStorage.getItem(MARKET_COLORS_KEY));
    return unsaved ?? stored;
  } catch {
    return unsaved ?? DEFAULT_MARKET_COLORS;
  }
}

/** Other tabs and our own writes notify. */
export function subscribeMarketColors(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === MARKET_COLORS_KEY) onChange(); };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Put the stored scheme on <html>; a no-op when it is already there. */
export function applyMarketColors(): void {
  const next = readMarketColors();
  if (document.documentElement.dataset.marketColors !== next) document.documentElement.dataset.marketColors = next;
}

/** The default clears the stored value; anything else is stored. */
export function storeMarketColors(next: MarketColors): void {
  try {
    if (next === DEFAULT_MARKET_COLORS) window.localStorage.removeItem(MARKET_COLORS_KEY);
    else window.localStorage.setItem(MARKET_COLORS_KEY, next);
    unsaved = null;
  } catch {
    unsaved = next;
  }
  applyMarketColors();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
