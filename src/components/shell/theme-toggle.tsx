'use client';

import { useTranslations } from 'next-intl';
import { Moon, Sun } from 'lucide-react';
import { toggledTheme } from '@/lib/theme';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/overlay';
import { useTheme } from './app-provider';

/**
 * Two-state toggle: the icon shows the theme on screen now (sun = light,
 * moon = dark); a click stores the opposite as the person's choice.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('Nav');
  const { resolvedTheme, setTheme } = useTheme();
  const next = toggledTheme(resolvedTheme);
  const label = t('themeSwitch', { current: t(`themes.${resolvedTheme}`), next: t(`themes.${next}`) });
  return (
    <Tooltip content={label}>
      <Button variant="ghost" size="icon-sm" className={className} onClick={() => setTheme(next)} aria-label={label}>
        {/* Icons follow html[data-theme] (set before paint), so there's no flash before hydration. */}
        <Sun className="dark:hidden" aria-hidden />
        <Moon className="hidden dark:block" aria-hidden />
      </Button>
    </Tooltip>
  );
}
