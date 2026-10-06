import type { ThemePref } from '@/lib/api/types';
import { parseStoredTheme, resolveTheme, THEME_KEY, type ResolvedTheme } from './theme';

// Browser-side theme store. The theme lives in localStorage + html[data-theme]
// (set before paint by THEME_SCRIPT), not in React context: a context value
// that flips during hydration (dark devices) forces React to re-render every
// still-dehydrated Suspense boundary below it, which on long boards exceeded
// React's nested-update limit ("Maximum update depth exceeded").

const CHANGE_EVENT = 'sm:theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia(DARK_QUERY).matches;
  } catch {
    return false;
  }
}

export function readThemePref(): ThemePref {
  try {
    return parseStoredTheme(window.localStorage.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

export function readResolvedTheme(): ResolvedTheme {
  return resolveTheme(readThemePref(), systemPrefersDark());
}

/** Device theme changes, other tabs and our own writes all notify. */
export function subscribeTheme(onChange: () => void): () => void {
  let mq: MediaQueryList | null = null;
  try {
    mq = window.matchMedia(DARK_QUERY);
    mq.addEventListener('change', onChange);
  } catch {
    mq = null;
  }
  const onStorage = (e: StorageEvent) => { if (e.key === null || e.key === THEME_KEY) onChange(); };
  window.addEventListener('storage', onStorage);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    mq?.removeEventListener('change', onChange);
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/** Put the resolved theme on <html>; a no-op when it is already there. */
export function applyTheme(): void {
  const next = readResolvedTheme();
  if (document.documentElement.dataset.theme !== next) document.documentElement.dataset.theme = next;
}

/** `'light'`/`'dark'` store an explicit choice; `'system'` clears it (follow the device). */
export function storeTheme(next: ThemePref): void {
  try {
    if (next === 'system') window.localStorage.removeItem(THEME_KEY);
    else window.localStorage.setItem(THEME_KEY, next);
  } catch {
    // Storage blocked: the choice lasts for this page view only.
  }
  applyTheme();
  window.dispatchEvent(new Event(CHANGE_EVENT));
}
