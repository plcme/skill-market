'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ChevronDown, SearchX } from 'lucide-react';
import { getBoard, type Board, type BoardQuery } from '@/lib/queries/market';
import { BOARD_PAGE, type BoardView } from './logic';
import { BoardCards, BoardColumnHeader, BoardRows } from './board';
import { WatchingBoard } from './watching-board';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/primitives';
import { useSearchAliases } from '@/lib/search/use-search-aliases';

/**
 * `initial` may carry only the first page of rows (the server trims it to keep the
 * payload small); `total` is the full count. Further pages are built here on "Show more".
 */
export function SearchableBoard({ initial, total, query, watching, view, resetHref, allHref }: {
  initial: Board; total: number; query: BoardQuery; watching: boolean; view: BoardView; resetHref: string; allHref: string;
}) {
  const t = useTranslations('MarketPage');
  const aliases = useSearchAliases();
  // A new query (tab, sort, search) starts again from the first page.
  const queryKey = JSON.stringify(query);
  const [page, setPage] = useState({ key: queryKey, shown: BOARD_PAGE });
  if (page.key !== queryKey) setPage({ key: queryKey, shown: BOARD_PAGE });
  const shown = page.key === queryKey ? page.shown : BOARD_PAGE;
  const searching = Boolean(query.q?.trim() && aliases.length);
  const full = useMemo(
    () => searching || shown > initial.rows.length && total > initial.rows.length ? getBoard(query, aliases) : null,
    [searching, shown, initial, total, query, aliases],
  );
  const board = full ?? initial;
  const count = full ? full.rows.length : total;
  const rows = watching ? board.rows : board.rows.slice(0, shown);
  const more = !watching && count > rows.length;
  const { type, filter, q = '' } = query;
  const firstOk = rows.find(r => r.metric.status === 'ok') ?? rows[0];
  const firstChangeOk = rows.find(r => r.change.status === 'ok') ?? rows[0];
  return <>
        {watching ? (
          <WatchingBoard rows={board.rows} filter={filter} metric={board.metric} view={view} q={q} allHref={allHref} resetHref={resetHref} />
        ) : (
          <>
            <p className="sr-only" aria-live="polite">
              {t(`count.${type}`, { n: count })}
              {q ? <>{' · '}{t('matching', { q })}</> : null}
            </p>

            <div className="mt-5">
              {rows.length === 0 ? (
                <EmptyState
                  icon={SearchX}
                  title={t('emptyTitle')}
                  action={q ? <Button asChild variant="outline" size="sm"><Link href={resetHref}>{t('emptyReset')}</Link></Button> : undefined}
                >
                  {q ? t('emptyBodyQuery', { q }) : t('emptyBody')}
                </EmptyState>
              ) : (
                <>
                  {/* Past the first pages the list fades out; more rows render only on request. */}
                  <div className="relative">
                    {view === 'cards' ? (
                      <BoardCards rows={rows} filter={filter} metric={board.metric} selectable />
                    ) : (
                      <>
                        <BoardColumnHeader type={type} metric={board.metric} filter={filter} sample={firstOk} changeSample={firstChangeOk} />
                        <BoardRows rows={rows} filter={filter} metric={board.metric} showType={type === 'all'} selectable />
                      </>
                    )}
                    {more ? <div aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-56 bg-gradient-to-b from-transparent via-paper/80 to-paper" /> : null}
                  </div>
                  {more ? (
                    <div className="relative z-10 -mt-6 flex justify-center">
                      <Button variant="outline" size="lg" onClick={() => setPage({ key: queryKey, shown: shown + BOARD_PAGE })}>{t('showMore')}<ChevronDown aria-hidden /></Button>
                    </div>
                  ) : null}
                </>
              )}
            </div>
          </>
        )}

  </>;
}
