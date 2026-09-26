import type { ThemePref } from '@/lib/api/types';

// Two-state theme (GLOSSARY §4): the UI only ever shows Light or Dark. With
// nothing stored we follow the device (`'system'` = unset); once the person
// picks one explicitly, their choice wins until they ask to match the device.

export type ResolvedTheme = 'light' | 'dark';

export const THEME_KEY = 'sm-theme';

/** Stored value → preference; anything unknown (or legacy `'system'`) means unset. */
export function parseStoredTheme(v: string | null | undefined): ThemePref {
  return v === 'light' || v === 'dark' ? v : 'system';
}

export function resolveTheme(pref: ThemePref, systemDark: boolean): ResolvedTheme {
  if (pref === 'light' || pref === 'dark') return pref;
  return systemDark ? 'dark' : 'light';
}

/** The header toggle flips whatever is showing now into an explicit choice. */
export function toggledTheme(resolved: ResolvedTheme): ResolvedTheme {
  return resolved === 'dark' ? 'light' : 'dark';
}

/** Resolves the theme before first paint to avoid a flash (inlined in <head>). */
export const THEME_SCRIPT = `(function(){var d=false;try{d=matchMedia('(prefers-color-scheme: dark)').matches}catch(e){}try{var p=localStorage.getItem('${THEME_KEY}');if(p==='dark')d=true;else if(p==='light')d=false}catch(e){}document.documentElement.dataset.theme=d?'dark':'light'})()`;
