import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, SearchX, SlidersHorizontal } from 'lucide-react';
import { decodeFilter, encodeFilter, isDefaultFilter } from '@/lib/filters/spec';
import { getBoard, getSignalsNow, type BoardType } from '@/lib/queries/market';
import { formatDate } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Container, EmptyState, PageHeader } from '@/components/ui/primitives';
import { FilterBar } from '@/components/market/filter-builder';
import { FilterReadback } from '@/components/market/filter-readback';
import { MetricSwitcher } from '@/components/market/metric-switcher';
import { SourceBadge } from '@/components/market/source-badge';
import { BoardCards, BoardColumnHeader, BoardRows } from '@/features/market/board';
import { BoardTextFilter, BoardViewControls, SharedMetricSelect } from '@/features/market/board-controls';
import { CompareBar, CompareModeToggle, CompareSelectionProvider } from '@/features/market/compare-select';
import { boardTypeParam, firstParam, hrefWith, parseBoardType, parseSort, parseView } from '@/features/market/logic';
import { SignalsStrip } from '@/features/market/signals-strip';
import { cn } from '@/lib/utils';

export async function generateMetadata({ searchParams }: PageProps<'/market'>): Promise<Metadata> {
  const t = await getTranslations('MarketPage');
  const type = parseBoardType((await searchParams).type);
  return { title: t(`metaTitle.${type}`), description: t('metaDescription') };
}

const TYPES: BoardType[] = ['all', 'skill', 'role'];

export default async function MarketPage({ searchParams }: PageProps<'/market'>) {
  const t = await getTranslations('MarketPage');
  const tf = await getTranslations('Filter');
  const sp = await searchParams;
  const type = parseBoardType(sp.type);
  const sort = parseSort(sp.sort);
  const view = parseView(sp.view);
  const q = firstParam(sp.q) ?? '';
  const metricParam = firstParam(sp.metric);
  const filter = decodeFilter(firstParam(sp.f));
  const f = isDefaultFilter(filter) ? undefined : encodeFilter(filter);

  const board = getBoard({ type, metric: metricParam, filter, sort, q });
  const signalsNow = getSignalsNow(filter);
  const keep = { f, sort: sort === 'value' ? undefined : sort, view: view === 'list' ? undefined : view };
  const typeHref = (next: BoardType) => hrefWith('/market', { type: boardTypeParam(next), ...keep });
  const resetHref = hrefWith('/market', { type: boardTypeParam(type), metric: metricParam, ...keep });
  const resetFilterHref = hrefWith('/market', { type: boardTypeParam(type), metric: metricParam, q: q || undefined, ...keep, f: undefined });
  const firstOk = board.rows.find(r => r.metric.status === 'ok') ?? board.rows[0];
  const firstChangeOk = board.rows.find(r => r.change.status === 'ok') ?? board.rows[0];

  return (
    <Container className="pb-20">
      <PageHeader
        kicker={(
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{t('kicker', { date: formatDate(board.as_of) })}</span>
            <SourceBadge kind="ads" />
          </span>
        )}
        title={t('title')}
        lede={t('lede')}
      />

      <SignalsStrip rows={signalsNow} filter={filter} />

      {/* Keyed by type: switching All/Skills/Roles starts a fresh selection. */}
      <CompareSelectionProvider key={type} f={f}>
      <section aria-labelledby="board-h" className="mt-8">
        <h2 id="board-h" className="sr-only">{t('boardHeading')}</h2>
        <div className="flex items-end justify-between gap-4 border-b border-rule">
          <nav aria-label={t('typeTabsLabel')} className="flex items-end gap-6">
            {TYPES.map(k => (
              <Link
                key={k}
                href={typeHref(k)}
                aria-current={k === type ? 'page' : undefined}
                className={cn(
                  '-mb-px border-b-2 pb-2.5 font-serif text-[22px] leading-none transition-colors sm:text-[26px]',
                  k === type ? 'border-ink text-ink' : 'border-transparent text-muted hover:text-ink',
                )}
              >
                {t(`types.${k}`)}
              </Link>
            ))}
          </nav>
          <div className="pb-2">
            <Suspense fallback={<div className="h-8 w-[88px] rounded-[5px] border border-rule bg-surface" />}>
              <FilterBar variant="button" />
            </Suspense>
          </div>
        </div>

        {f ? (
          <p className="mt-2.5 flex min-w-0 items-start gap-2 text-[13px] leading-snug text-ink-2 sm:items-center">
            <SlidersHorizontal className="mt-0.5 size-3.5 shrink-0 text-muted sm:mt-0" aria-hidden />
            <span className="sr-only">{t('filterScopeLabel')}: </span>
            <FilterReadback filter={filter} className="min-w-0 sm:truncate" />
            <Link href={resetFilterHref} className="link shrink-0">{tf('scopeReset')}</Link>
          </p>
        ) : null}

        <Suspense fallback={<div className="mt-4 h-8" />}>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <BoardTextFilter initial={q} className="w-full sm:w-80" />
            {type === 'all'
              ? <SharedMetricSelect value={board.metric} />
              : <MetricSwitcher type={type} value={board.metric} />}
            <BoardViewControls sort={sort} view={view} />
            <CompareModeToggle className="lg:ml-auto" />
          </div>
        </Suspense>

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
              action={<Button asChild variant="outline" size="sm"><Link href={resetHref}>{t('emptyReset')}</Link></Button>}
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

        <div className="mt-6 grid gap-3 text-[13px] leading-relaxed text-muted md:grid-cols-2 md:gap-8">
          <p>{t('orderNote')}</p>
          <p>
            {t('illustrativeNote')}{' '}
            <Link href="/sources" className="link inline-flex items-center gap-1">{t('sourcesLink')}<ArrowRight className="size-3" aria-hidden /></Link>
          </p>
        </div>
        <CompareBar />
      </section>
      </CompareSelectionProvider>
    </Container>
  );
}
