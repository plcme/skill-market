'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { RequireSession } from '@/components/shell/require-session';
import { Container, PageHeader } from '@/components/ui/primitives';
import type { DemoDB } from '@/lib/api/types';
import { cn } from '@/lib/utils';

const TABS = ['reports', 'review', 'pipeline', 'metrics', 'taxonomy'] as const;

/** Admin frame: guard + sub-navigation. Children receive the store snapshot. */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Admin');
  const pathname = usePathname();
  return (
    <RequireSession persona="admin">
      {() => (
        <Container className="pb-24">
          <PageHeader kicker={t('kicker')} title={t('title')} lede={t('lede')} />
          <nav aria-label={t('nav')} className="mb-8 overflow-x-auto border-b border-rule scrollbar-none">
            <ul className="flex gap-1">
              {TABS.map(tab => {
                const href = `/admin/${tab}`;
                const active = pathname === href;
                return (
                  <li key={tab}>
                    <Link href={href} aria-current={active ? 'page' : undefined} className={cn('-mb-px inline-block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm', active ? 'border-ink font-medium text-ink' : 'border-transparent text-muted hover:text-ink')}>
                      {t(`tabs.${tab}`)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          {children}
        </Container>
      )}
    </RequireSession>
  );
}

/** Render-prop helper for admin pages that need the store. */
export function WithDB({ children }: { children: (db: DemoDB) => React.ReactNode }) {
  return <RequireSession persona="admin">{children}</RequireSession>;
}
