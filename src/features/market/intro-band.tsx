import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import { getIndustryHeatmap } from '@/lib/queries/market';
import { HeatmapSource, HeatmapTable, HeatmapTiles, TREEMAP_ASPECT } from '@/components/market/heatmap';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';
import { INTRO_ID } from './intro';
import { FlipToBoardLink, IntroPager } from './intro-pager';

// The band fills the first screen under the tape (h-8) and sticky header
// (h-16 + 1px rule), above the phone tab bar (h-16 + safe area), leaving the
// board's type tabs peeking at the bottom edge.
const BAND_HEIGHT = 'h-[calc(100svh-97px-4rem-env(safe-area-inset-bottom)-4.5rem)] sm:h-[calc(100svh-97px-4rem-env(safe-area-inset-bottom)-5.75rem)] md:h-[calc(100svh-97px-5.75rem)]';
// Phones and short screens: the tiles don't fit, so they and their source line
// go; the table (with the source in its caption) stays for screen readers, and
// the heading row turns sr-only, its link reappearing whenever it has focus.
const HEAT_VISUAL = '[@media(max-width:39.99rem),(max-height:31.99rem)]:hidden';
const HEAT_SR = '[@media(max-width:39.99rem),(max-height:31.99rem)]:sr-only';
const HEAT_SR_FOCUSABLE = cn(HEAT_SR, '[@media(max-width:39.99rem),(max-height:31.99rem)]:focus:not-sr-only');
/** Only where the tiles show: cap the column so the treemap's height fits what the heading row and source line leave. */
const HEAT_WIDTH = '[@media(min-width:40rem)_and_(min-height:32rem)]:w-[var(--heat-w)]';
const HEAT_CHROME = '6rem';

/**
 * The landing band on top of the board: what the market is, today's
 * industries, and the way in. Synchronous on purpose: nothing in it may
 * suspend, so it streams in document order, ahead of the board.
 */
export function IntroBand() {
  const t = useTranslations('Home');
  const tt = useTranslations('Ticker');
  const heat = getIndustryHeatmap(DEFAULT_FILTER);

  return (
    <section id={INTRO_ID} aria-labelledby="intro-h" className={cn('flex min-h-min flex-col border-b border-rule', BAND_HEIGHT)}>
      <IntroPager />
      <Container className="flex flex-1 flex-col gap-8 py-8 lg:grid lg:grid-cols-[1.25fr_1fr] lg:gap-16 lg:py-10">
        <div className="flex flex-col justify-center animate-rise max-sm:flex-1">
          <h2 id="intro-h" className="display text-[46px] sm:text-[64px] lg:text-[76px]">{t('headline')}</h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><FlipToBoardLink>{t('ctaMarket')}</FlipToBoardLink></Button>
          </div>
        </div>

        {/* A size container: the treemap takes whatever height is left, never more. */}
        <section aria-labelledby="heat-title" className="flex min-h-0 min-w-0 flex-col justify-center animate-rise [animation-delay:80ms] [container-type:size] sm:flex-1">
          <div className={HEAT_WIDTH} style={{ '--heat-w': `min(100cqw, calc((100cqh - ${HEAT_CHROME}) * ${TREEMAP_ASPECT}))` } as React.CSSProperties}>
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h3 id="heat-title" className={cn('kicker text-ink', HEAT_SR)}>{t('heatKicker')}</h3>
              <Link href="/market?type=industry" className={cn('link text-[13px]', HEAT_SR_FOCUSABLE)}>{t('heatAll')}</Link>
            </div>
            <HeatmapTiles heatmap={heat} filter={DEFAULT_FILTER} label={t('heatLabel')} className={HEAT_VISUAL} />
            <HeatmapSource heatmap={heat} filter={DEFAULT_FILTER} className={cn('mt-4', HEAT_VISUAL)} />
          </div>
          <HeatmapTable heatmap={heat} caption={t('heatLabel')} nameHead={tt('industry')} withSource />
        </section>
      </Container>
    </section>
  );
}
