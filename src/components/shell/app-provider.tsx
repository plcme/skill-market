'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ToastProvider } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/overlay';
import type { ThemePref } from '@/lib/api/types';
import { parseStoredTheme, resolveTheme, THEME_KEY, type ResolvedTheme } from '@/lib/theme';

interface AppContextValue {
  appName: string;
  /** Stored preference; `'system'` means nothing stored (follow the device). */
  theme: ThemePref;
  /** What is on screen right now — the only state the UI shows. */
  resolvedTheme: ResolvedTheme;
  /** `'light'`/`'dark'` store an explicit choice; `'system'` clears it. */
  setTheme: (t: ThemePref) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Product name comes from the server-only APP_NAME constant via the root layout. */
export function useAppName(): string {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppName must be used inside <AppProvider>');
  return ctx.appName;
}

export function useTheme(): Pick<AppContextValue, 'theme' | 'resolvedTheme' | 'setTheme'> {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useTheme must be used inside <AppProvider>');
  return ctx;
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return false;
  }
}

function readStored(): ThemePref {
  try {
    return parseStoredTheme(window.localStorage.getItem(THEME_KEY));
  } catch {
    return 'system';
  }
}

export function AppProvider({ appName, children }: { appName: string; children: React.ReactNode }) {
  const t = useTranslations('Common');
  const [theme, setThemeState] = useState<ThemePref>('system');
  const [systemDark, setSystemDark] = useState(false);
  // False until state mirrors storage/device, so we never overwrite the
  // pre-paint theme with the server-render defaults (no flash).
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    // Sync React state with what THEME_SCRIPT already applied before paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(readStored());
    setSystemDark(systemPrefersDark());
    setSynced(true);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const resolvedTheme = resolveTheme(theme, systemDark);
  useEffect(() => {
    if (synced) document.documentElement.dataset.theme = resolvedTheme;
  }, [synced, resolvedTheme]);
  const setTheme = useCallback((next: ThemePref) => {
    setThemeState(next);
    try {
      if (next === 'system') window.localStorage.removeItem(THEME_KEY);
      else window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // Storage blocked: the choice lasts for this page view only.
    }
  }, []);
  const value = useMemo(() => ({ appName, theme, resolvedTheme, setTheme }), [appName, theme, resolvedTheme, setTheme]);
  return (
    <AppContext.Provider value={value}>
      <TooltipProvider>
        <ToastProvider dismissLabel={t('dismiss')}>{children}</ToastProvider>
      </TooltipProvider>
    </AppContext.Provider>
  );
}
