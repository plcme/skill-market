'use client';

import { createContext, useContext, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useTranslations } from 'next-intl';
import { ToastProvider } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/overlay';
import type { ThemePref } from '@/lib/api/types';
import type { ResolvedTheme } from '@/lib/theme';
import { applyTheme, readResolvedTheme, readThemePref, storeTheme, subscribeTheme } from '@/lib/theme-store';

interface AppContextValue {
  appName: string;
}

const AppContext = createContext<AppContextValue | null>(null);

/** Product name comes from the server-only APP_NAME constant via the root layout. */
export function useAppName(): string {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppName must be used inside <AppProvider>');
  return ctx.appName;
}

const serverPref = (): ThemePref => 'system';
const serverResolved = (): ResolvedTheme => 'light';

/**
 * Theme for the few components that show it (header toggle, settings). Read
 * from an external store, not context, so a dark device doesn't change a
 * context value during hydration (see `src/lib/theme-store.ts`).
 * - `theme`: stored preference; `'system'` means nothing stored (follow the device).
 * - `resolvedTheme`: what is on screen right now — the only state the UI shows.
 */
export function useTheme(): { theme: ThemePref; resolvedTheme: ResolvedTheme; setTheme: (t: ThemePref) => void } {
  const theme = useSyncExternalStore(subscribeTheme, readThemePref, serverPref);
  const resolvedTheme = useSyncExternalStore(subscribeTheme, readResolvedTheme, serverResolved);
  return { theme, resolvedTheme, setTheme: storeTheme };
}

export function AppProvider({ appName, children }: { appName: string; children: React.ReactNode }) {
  const t = useTranslations('Common');
  // Follow the device (and other tabs) after load; THEME_SCRIPT already set it before paint.
  useEffect(() => subscribeTheme(applyTheme), []);
  const value = useMemo(() => ({ appName }), [appName]);
  return (
    <AppContext.Provider value={value}>
      <TooltipProvider>
        <ToastProvider dismissLabel={t('dismiss')}>{children}</ToastProvider>
      </TooltipProvider>
    </AppContext.Provider>
  );
}
