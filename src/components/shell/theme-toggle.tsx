'use client';

import { useTranslations } from 'next-intl';
import { Monitor, Moon, Sun } from 'lucide-react';
import type { ThemePref } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/overlay';
import { useTheme } from './app-provider';

const ORDER: ThemePref[] = ['system', 'light', 'dark'];
const ICON = { system: Monitor, light: Sun, dark: Moon };

export function ThemeToggle({ className }: { className?: string }) {
  const t = useTranslations('Nav');
  const { theme, setTheme } = useTheme();
  const Icon = ICON[theme];
  const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
  const label = `${t('theme')}: ${t(`themes.${theme}`)}`;
  return (
    <Tooltip content={label}>
      <Button variant="ghost" size="icon-sm" className={className} onClick={() => setTheme(next)} aria-label={label}>
        <Icon aria-hidden />
      </Button>
    </Tooltip>
  );
}
