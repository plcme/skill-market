'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Bookmark, SearchX } from 'lucide-react';
import { useDB } from '@/lib/demo/store';
import { loginHref } from '@/lib/links';
import type { FilterSpec, InstrumentSnapshot, MetricKey } from '@/lib/market/types';
import { Button } from '@/components/ui/button';
import { EmptyState, Skeleton } from '@/components/ui/primitives';
import { BoardCards, BoardColumnHeader, BoardRows } from './board';
import { watchedRows, watchedSlugs, type BoardView } from './logic';

// The /market Watching tab. Watches live in the browser preview store, so the
// server passes the All board's rows and this keeps the watched ones.

function useWatched(): { ready: boolean; signedIn: boolean; slugs: Set<string> } {
  const db = useDB();
  const signedIn = Boolean(db?.session?.personas.includes('student'));
  return { ready: Boolean(db), signedIn, slugs: signedIn && db ? watchedSlugs(db.watchlist) : new Set() };
}

/** Number of watched instruments, shown in the tab; nothing for visitors. */
export function WatchingTabCount() {
  const { signedIn, slugs } = useWatched();
  if (!signedIn) return null;
  return <span className="num text-[12px] font-normal text-muted">{slugs.size}</span>;
}

export function WatchingBoard({ rows, filter, metric, view, q, allHref, resetHref }: {
  /** The All board's rows under the page's filter, metric, sort and name filter. */
  rows: InstrumentSnapshot[];
  filter: FilterSpec;
  metric: MetricKey;
  view: BoardView;
  q: string;
  allHref: string;
  resetHref: string;
}) {
  const t = useTranslations('MarketPage');
  const { ready, signedIn, slugs } = useWatched();

  if (!ready) return <div className="mt-5 flex flex-col gap-3" aria-hidden><Skeleton className="h-3 w-40" /><Skeleton className="h-16" /></div>;

  if (!signedIn) {
    return (
      <EmptyState
        icon={Bookmark}
        className="mt-5 py-6"
        title={t('watching.signedOut')}
        action={<Button asChild size="sm"><Link href={loginHref('/market?type=watching')}>{t('watching.signIn')}</Link></Button>}
      />
    );
  }

  if (slugs.size === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        className="mt-5 py-6"
        title={t('watching.empty')}
        action={<Link href={allHref} className="link text-sm">{t('watching.browseAll')}</Link>}
      />
    );
  }

  const list = watchedRows(rows, slugs);
  const firstOk = list.find(r => r.metric.status === 'ok') ?? list[0];
  const firstChangeOk = list.find(r => r.change.status === 'ok') ?? list[0];
  return (
    <>
      <p className="sr-only" aria-live="polite">
        {t('count.all', { n: list.length })}
        {q ? <>{' · '}{t('matching', { q })}</> : null}
      </p>
      <div className="mt-5">
        {list.length === 0 ? (
          <EmptyState
            icon={SearchX}
            title={t('emptyTitle')}
            action={q ? <Button asChild variant="outline" size="sm"><Link href={resetHref}>{t('emptyReset')}</Link></Button> : undefined}
          >
            {q ? t('emptyBodyQuery', { q }) : t('emptyBody')}
          </EmptyState>
        ) : view === 'cards' ? (
          <BoardCards rows={list} filter={filter} metric={metric} selectable />
        ) : (
          <>
            <BoardColumnHeader type="all" metric={metric} filter={filter} sample={firstOk} changeSample={firstChangeOk} />
            <BoardRows rows={list} filter={filter} metric={metric} showType selectable />
          </>
        )}
      </div>
    </>
  );
}
