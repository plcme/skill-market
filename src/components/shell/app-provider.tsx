'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ToastProvider } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/overlay';
import type { ThemePref } from '@/lib/api/types';

interface AppContextValue {
  appName: string;
  theme: ThemePref;
  setTheme: (t: ThemePref) => void;
}

const AppContext = createContext<AppContextValue | null>(null);
export const THEME_KEY = 'sm-theme';

/** Product name comes from the server-only APP_NAME constant via the root layout. */
export function useAppName(): string {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppName must be used inside <AppProvider>');
  return ctx.appName;
}

export function useTheme(): Pick<AppContextValue, 'theme' | 'setTheme'> {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useTheme must be used inside <AppProvider>');
  return ctx;
}

function applyTheme(pref: ThemePref) {
  const dark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}

export function AppProvider({ appName, children }: { appName: string; children: React.ReactNode }) {
  const t = useTranslations('Common');
  const [theme, setThemeState] = useState<ThemePref>('system');
  useEffect(() => {
    let stored: ThemePref = 'system';
    try {
      const v = window.localStorage.getItem(THEME_KEY);
      if (v === 'light' || v === 'dark' || v === 'system') stored = v;
    } catch {
      // Storage blocked: stay on system.
    }
    // Sync React state with what ThemeScript already applied before paint.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeState(stored);
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      try {
        if ((window.localStorage.getItem(THEME_KEY) ?? 'system') === 'system') applyTheme('system');
      } catch {
        applyTheme('system');
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  const setTheme = useCallback((next: ThemePref) => {
    setThemeState(next);
    try {
      window.localStorage.setItem(THEME_KEY, next);
    } catch {
      // ignore
    }
    applyTheme(next);
  }, []);
  const value = useMemo(() => ({ appName, theme, setTheme }), [appName, theme, setTheme]);
  return (
    <AppContext.Provider value={value}>
      <TooltipProvider>
        <ToastProvider dismissLabel={t('dismiss')}>{children}</ToastProvider>
      </TooltipProvider>
    </AppContext.Provider>
  );
}

/** Resolves the theme before first paint to avoid a flash. */
export const THEME_SCRIPT = `(function(){try{var p=localStorage.getItem('${THEME_KEY}')||'system';var d=p==='dark'||(p==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=d?'dark':'light'}catch(e){document.documentElement.dataset.theme='light'}})()`;
