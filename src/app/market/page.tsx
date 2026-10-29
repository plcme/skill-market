import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ArrowRight, Bookmark } from 'lucide-react';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import { getBoard } from '@/lib/queries/market';
import { Container } from '@/components/ui/primitives';
import { SearchableBoard } from '@/features/market/searchable-board';
import { BoardTextFilter, BoardViewControls, SkillLayerSwitch } from '@/features/market/board-controls';
import { CompareBar, CompareModeToggle, CompareSelectionProvider } from '@/features/market/compare-select';
import { BOARD_PAGE, BOARD_TYPES, boardForTab, boardTypeParam, canonicalMarketQuery, firstParam, hrefWith, layerParam, parseBoardType, parseLayer, parseSort, parseView, type MarketTab } from '@/features/market/logic';
import { WatchingTabCount } from '@/features/market/watching-board';
import { BoardTabsBar } from '@/features/market/board-tabs-bar';
import { BOARD_ANCHOR_ID } from '@/features/market/intro';
import { cn } from '@/lib/utils';

// Board type tabs, Watching included.
// Pinned under the header (`data-stuck` on the bar) the tabs shrink and breathe; the nav keeps
// their unpinned height (19/26px text + pb-2.5 + 2px rule) so pinning never moves the board.
const TAB = 'shrink-0 border-b-2 pb-2.5 font-serif text-[19px] leading-none transition-[color,font-size] sm:text-[26px] group-data-[stuck=true]:text-[18px] sm:group-data-[stuck=true]:text-[22px]';
const TAB_CURRENT = 'border-ink text-ink';
const TAB_OTHER = 'border-transparent text-muted hover:text-ink';

export async function generateMetadata({ searchParams }: PageProps<'/market'>): Promise<Metadata> {
  const t = await getTranslations('MarketPage');
  const type = parseBoardType((await searchParams).type);
  return { title: t(`metaTitle.${type}`), description: t('metaDescription') };
}

export default async function MarketPage({ searchParams }: PageProps<'/market'>) {
  const t = await getTranslations('MarketPage');
  const sp = await searchParams;
  // The board always covers all of Australia; filters live on detail pages.
  const canonical = canonicalMarketQuery(sp);
  if (canonical !== null) redirect(`/market${canonical ? `?${canonical}` : ''}`);
  const tab = parseBoardType(sp.type);
  const type = boardForTab(tab);
  const sort = parseSort(sp.sort);
  const view = parseView(sp.view);
  const layer = type === 'skill' ? parseLayer(sp.layer) : null;
  const q = firstParam(sp.q) ?? '';
  const metricParam = firstParam(sp.metric);
  const filter = DEFAULT_FILTER;

  const board = getBoard({ type, metric: metricParam, filter, sort, q, layer });
  const keep = { sort: sort === 'value' ? undefined : sort, view: view === 'list' ? undefined : view };
  const typeHref = (next: MarketTab) => hrefWith('/market', { type: boardTypeParam(next), ...keep });
  const resetHref = hrefWith('/market', { type: boardTypeParam(tab), metric: metricParam, layer: layerParam(layer), ...keep });

  return (
    <Container className="pb-20">
      {/* Keyed by type: switching board tabs starts a fresh selection. */}
      <CompareSelectionProvider key={tab}>
      {/* Scroll margin = sticky header (h-16 + 1px rule), so #board lands just under it; focusable so the band's link can move focus here. */}
      <section id={BOARD_ANCHOR_ID} tabIndex={-1} aria-labelledby="board-h" className="scroll-mt-[65px] pt-6 outline-none sm:pt-10">
        <h2 id="board-h" className="sr-only">{t('boardHeading')}</h2>
        <BoardTabsBar>
          {/* Scrolls sideways at narrow widths; the nav (not the tabs) overlaps the rule so nothing overflows vertically. */}
          <nav aria-label={t('typeTabsLabel')} className="-mb-px flex h-[31px] min-w-0 items-end sm:h-[38px] gap-x-3 overflow-x-auto whitespace-nowrap [scrollbar-width:none] sm:gap-x-6 [&::-webkit-scrollbar]:hidden">
            <Link
              scroll={false}
              href={typeHref('watching')}
              aria-current={tab === 'watching' ? 'page' : undefined}
              className={cn(TAB, 'inline-flex items-baseline gap-1.5 sm:gap-2', tab === 'watching' ? TAB_CURRENT : TAB_OTHER)}
            >
              <Bookmark className="size-[15px] sm:size-5 sm:group-data-[stuck=true]:size-[18px]" strokeWidth={1.75} aria-hidden />
              {t('types.watching')}
              <Suspense fallback={null}><WatchingTabCount /></Suspense>
            </Link>
            <span aria-hidden className="mb-2.5 h-5 w-px shrink-0 bg-rule-strong sm:h-6 group-data-[stuck=true]:h-4 sm:group-data-[stuck=true]:h-5" />
            {BOARD_TYPES.map(k => (
              <Link
                key={k}
                scroll={false}
                href={typeHref(k)}
                aria-current={k === tab ? 'page' : undefined}
                className={cn(TAB, k === tab ? TAB_CURRENT : TAB_OTHER)}
              >
                {t(`types.${k}`)}
              </Link>
            ))}
          </nav>
        </BoardTabsBar>

        {type === 'skill' ? (
          <Suspense fallback={<div className="mt-3 h-8" />}>
            <SkillLayerSwitch value={layer} className="mt-3" />
          </Suspense>
        ) : null}

        <Suspense fallback={<div className="mt-4 h-8" />}>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <BoardTextFilter initial={q} className="w-full sm:w-80" />
            <BoardViewControls sort={sort} view={view} />
            <CompareModeToggle className="lg:ml-auto" />
          </div>
        </Suspense>

        <SearchableBoard initial={tab === 'watching' ? board : { ...board, rows: board.rows.slice(0, BOARD_PAGE) }} total={board.rows.length} query={{ type, metric: metricParam, filter, sort, q, layer }} watching={tab === 'watching'} view={view} resetHref={resetHref} allHref={typeHref('all')} />

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
