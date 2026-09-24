import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, SearchX } from 'lucide-react';
import { decodeFilter, encodeFilter, isDefaultFilter } from '@/lib/filters/spec';
import { getBoard, getSignalsNow, type BoardType } from '@/lib/queries/market';
import { formatDate } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Container, EmptyState, PageHeader } from '@/components/ui/primitives';
import { FilterBar } from '@/components/market/filter-builder';
import { MetricSwitcher } from '@/components/market/metric-switcher';
import { SourceBadge } from '@/components/market/source-badge';
import { BoardCards, BoardColumnHeader, BoardRows } from '@/features/market/board';
import { BoardTextFilter, BoardViewControls, SharedMetricSelect } from '@/features/market/board-controls';
import { firstParam, hrefWith, parseBoardType, parseSort, parseView } from '@/features/market/logic';
import { SignalsStrip } from '@/features/market/signals-strip';
import { cn } from '@/lib/utils';

export async function generateMetadata({ searchParams }: PageProps<'/market'>): Promise<Metadata> {
  const t = await getTranslations('MarketPage');
  const type = parseBoardType((await searchParams).type);
  return { title: t(`metaTitle.${type}`), description: t('metaDescription') };
}

const TYPES: BoardType[] = ['skill', 'role', 'all'];

export default async function MarketPage({ searchParams }: PageProps<'/market'>) {
  const t = await getTranslations('MarketPage');
  const sp = await searchParams;
  const type = parseBoardType(sp.type);
  const sort = parseSort(sp.sort);
  const view = parseView(sp.view);
  const q = firstParam(sp.q) ?? '';
  const category = firstParam(sp.cat);
  const metricParam = firstParam(sp.metric);
  const filter = decodeFilter(firstParam(sp.f));
  const f = isDefaultFilter(filter) ? undefined : encodeFilter(filter);

  const board = getBoard({ type, metric: metricParam, filter, sort, q, category });
  const signalsNow = getSignalsNow(filter);
  const keep = { f, sort: sort === 'value' ? undefined : sort, view: view === 'list' ? undefined : view };
  const typeHref = (next: BoardType) => hrefWith('/market', { type: next === 'skill' ? undefined : next, ...keep });
  const catHref = (next?: string) => hrefWith('/market', { type: type === 'skill' ? undefined : type, metric: metricParam, cat: next, q: q || undefined, ...keep });
  const resetHref = hrefWith('/market', { type: type === 'skill' ? undefined : type, metric: metricParam, ...keep });
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

      <section aria-labelledby="board-h" className="mt-8">
        <h2 id="board-h" className="sr-only">{t('boardHeading')}</h2>
        <nav aria-label={t('typeTabsLabel')} className="flex items-end gap-6 border-b border-rule">
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

        <Suspense fallback={<div className="mt-4 h-[62px] rounded-md border border-rule bg-surface" />}>
          <FilterBar className="mt-4" />
        </Suspense>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <Suspense fallback={<div className="h-8" />}>
            <div className="flex flex-wrap items-center gap-2">
              {type === 'all'
                ? <SharedMetricSelect value={board.metric} />
                : <MetricSwitcher type={type} value={board.metric} />}
              <BoardViewControls sort={sort} view={view} />
            </div>
            <BoardTextFilter initial={q} className="w-full lg:w-64" />
          </Suspense>
        </div>

        {board.categories.length > 1 ? (
          <nav aria-label={t('categoriesLabel')} className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
            {[undefined, ...board.categories].map(c => {
              const active = c === category || (!c && !category);
              return (
                <Link
                  key={c ?? 'all'}
                  href={catHref(c)}
                  aria-current={active ? 'true' : undefined}
                  className={cn(
                    'inline-flex h-7 shrink-0 items-center rounded-full border px-3 text-[12.5px] font-medium transition-colors',
                    active ? 'border-ink bg-ink text-paper' : 'border-rule bg-surface text-ink-2 hover:border-ink/40',
                  )}
                >
                  {c ?? t('allCategories')}
                </Link>
              );
            })}
          </nav>
        ) : null}

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
            <BoardCards rows={board.rows} filter={filter} metric={board.metric} />
          ) : (
            <>
              <BoardColumnHeader type={type} metric={board.metric} filter={filter} sample={firstOk} changeSample={firstChangeOk} />
              <BoardRows rows={board.rows} filter={filter} metric={board.metric} showType={type === 'all'} />
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
      </section>
    </Container>
  );
}
