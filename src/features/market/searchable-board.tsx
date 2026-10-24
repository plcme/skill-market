'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SearchX } from 'lucide-react';
import { getBoard, type Board, type BoardQuery } from '@/lib/queries/market';
import type { BoardView } from './logic';
import { BoardCards, BoardColumnHeader, BoardRows } from './board';
import { WatchingBoard } from './watching-board';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/primitives';
import { useSearchAliases } from '@/lib/search/use-search-aliases';

export function SearchableBoard({ initial, query, watching, view, resetHref, allHref }: {
  initial: Board; query: BoardQuery; watching: boolean; view: BoardView; resetHref: string; allHref: string;
}) {
  const t = useTranslations('MarketPage');
  const aliases = useSearchAliases();
  const board = useMemo(() => query.q?.trim() && aliases.length ? getBoard(query, aliases) : initial, [query, aliases, initial]);
  const { type, filter, q = '' } = query;
  const firstOk = board.rows.find(r => r.metric.status === 'ok') ?? board.rows[0];
  const firstChangeOk = board.rows.find(r => r.change.status === 'ok') ?? board.rows[0];
  return <>
        {watching ? (
          <WatchingBoard rows={board.rows} filter={filter} metric={board.metric} view={view} q={q} allHref={allHref} resetHref={resetHref} />
        ) : (
          <>
            <p className="num mt-5 text-[13px] text-muted" aria-live="polite">
              {t(`count.${type}`, { n: board.rows.length })}
              {' · '}
              {t('signalCount', { n: board.signals })}
              {q ? <>{' · '}{t('matching', { q })}</> : null}
            </p>

            <div className="mt-2">
              {board.rows.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title={t('emptyTitle')}
                  action={q ? <Button asChild variant="outline" size="sm"><Link href={resetHref}>{t('emptyReset')}</Link></Button> : undefined}
                >
                  {q ? t('emptyBodyQuery', { q }) : t('emptyBody')}
                </EmptyState>
              ) : view === 'cards' ? (
                <BoardCards rows={board.rows} filter={filter} metric={board.metric} selectable />
              ) : (
                <>
                  <BoardColumnHeader type={type} metric={board.metric} filter={filter} sample={firstOk} changeSample={firstChangeOk} />
                  <BoardRows rows={board.rows} filter={filter} metric={board.metric} showType={type === 'all'} selectable />
                </>
              )}
            </div>
          </>
        )}

  </>;
}
