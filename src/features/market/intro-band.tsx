import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowDown } from 'lucide-react';
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
/** Phones and short screens: the tiles don't fit, so only their screen-reader table and link remain. */
const HEAT_VISUAL = 'max-sm:hidden [@media(max-height:31.99rem)]:hidden';
const HEAT_HEAD = 'max-sm:sr-only [@media(max-height:31.99rem)]:sr-only';
/** Room the heat heading row and source line take, so the treemap gets the rest of the column's height. */
const HEAT_CHROME = '6rem';

/** First-visit band on top of the board: what the market is, today's industries, and the way in. */
export async function IntroBand() {
  const t = await getTranslations('Home');
  const tt = await getTranslations('Ticker');
  const heat = getIndustryHeatmap(DEFAULT_FILTER);

  return (
    <section id={INTRO_ID} aria-labelledby="intro-h" className={cn('flex min-h-min flex-col border-b border-rule', BAND_HEIGHT)}>
      <IntroPager />
      <Container className="flex flex-1 flex-col gap-8 py-8 lg:grid lg:grid-cols-[1.25fr_1fr] lg:gap-16 lg:py-10">
        <div className="flex flex-col justify-center animate-rise max-sm:flex-1">
          <h2 id="intro-h" className="display text-[46px] sm:text-[64px] lg:text-[76px]">{t('headline')}</h2>
          <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2 sm:text-lg">{t('lede')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg"><FlipToBoardLink>{t('ctaMarket')}<ArrowDown aria-hidden /></FlipToBoardLink></Button>
            <Button asChild size="lg" variant="outline"><Link href="/onboarding">{t('ctaStart')}</Link></Button>
          </div>
        </div>

        {/* A size container: the treemap takes whatever height is left, never more. */}
        <section aria-labelledby="heat-title" className="flex min-h-0 min-w-0 flex-col justify-center animate-rise [animation-delay:80ms] [container-type:size] sm:flex-1">
          <div style={{ width: `min(100cqw, calc((100cqh - ${HEAT_CHROME}) * ${TREEMAP_ASPECT}))` }}>
            <div className={cn('mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1', HEAT_HEAD)}>
              <h3 id="heat-title" className="kicker text-ink">{t('heatKicker')}</h3>
              <Link href="/market?type=industry" className="link text-[13px]">{t('heatAll')}</Link>
            </div>
            <HeatmapTiles heatmap={heat} filter={DEFAULT_FILTER} label={t('heatLabel')} className={HEAT_VISUAL} />
            <HeatmapSource heatmap={heat} filter={DEFAULT_FILTER} className={cn('mt-4', HEAT_VISUAL)} />
          </div>
          <HeatmapTable heatmap={heat} caption={t('heatLabel')} nameHead={tt('industry')} />
        </section>
      </Container>
    </section>
  );
}
