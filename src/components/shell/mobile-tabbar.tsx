'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Coffee, LayoutDashboard, LineChart, LogIn, Search } from 'lucide-react';
import { useDB } from '@/lib/demo/store';
import { cn } from '@/lib/utils';
import { openSearch } from './command-palette';
import { deskFor, isActive } from './nav-model';

/** Thumb-reach navigation for the 375px core flows (NFR-2). */
export function MobileTabBar() {
  const t = useTranslations('Nav');
  const pathname = usePathname();
  const db = useDB();
  const desk = deskFor(db?.session ?? null);
  const item = 'flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[11px] font-medium text-muted aria-[current=page]:text-ink';
  return (
    <nav aria-label={t('primary')} className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-rule bg-paper/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="flex h-16">
        <Link href="/market" className={item} aria-current={isActive(pathname, '/market') || pathname === '/' ? 'page' : undefined}>
          <LineChart className="size-5" aria-hidden />{t('market')}
        </Link>
        <button type="button" onClick={openSearch} className={item}>
          <Search className="size-5" aria-hidden />{t('search')}
        </button>
        <Link href="/people" className={item} aria-current={isActive(pathname, '/people') || isActive(pathname, '/chat') ? 'page' : undefined}>
          <Coffee className="size-5" aria-hidden />{t('chats')}
        </Link>
        {desk ? (
          <Link href={desk.href} className={item} aria-current={isActive(pathname, desk.href) ? 'page' : undefined}>
            <LayoutDashboard className="size-5" aria-hidden />{t(desk.key === 'desk' ? 'desk' : desk.key)}
          </Link>
        ) : (
          <Link href="/auth/login" className={cn(item)} aria-current={isActive(pathname, '/auth') ? 'page' : undefined}>
            <LogIn className="size-5" aria-hidden />{t('signIn')}
          </Link>
        )}
      </div>
    </nav>
  );
}
