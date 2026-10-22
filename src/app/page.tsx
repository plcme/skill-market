import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import { getBoard, getIndustryHeatmap, getMovers } from '@/lib/queries/market';
import { METRICS } from '@/lib/metrics/registry';
import { HeatmapLegend, HeatmapTable, HeatmapTiles } from '@/components/market/heatmap';
import { MoversCarousel, type MoverItem } from '@/features/home/movers-carousel';
import { Button } from '@/components/ui/button';
import { Container, SectionHeader } from '@/components/ui/primitives';
import { ChangeBadge } from '@/components/market/change-badge';
import { MetricInfo } from '@/components/market/metric-info';
import { ROW_WATCH_LABEL, TickerRow, instrumentHref } from '@/components/market/ticker';
import { WatchButton } from '@/components/market/watch-button';
import { PractitionerJoinCard } from '@/features/community/practitioner-join-card';

export default async function HomePage() {
  const t = await getTranslations('Home');
  const tt = await getTranslations('Ticker');
  const skills = getBoard({ type: 'skill', filter: DEFAULT_FILTER });
  const roles = getBoard({ type: 'role', filter: DEFAULT_FILTER, metric: 'growth_12m' });
  const heat = getIndustryHeatmap(DEFAULT_FILTER);
  const movers: MoverItem[] = getMovers(DEFAULT_FILTER, 4).map(m => ({
    slug: m.instrument.slug,
    type: m.instrument.type,
    name: m.instrument.name,
    symbol: m.instrument.symbol,
    change: m.change.value ?? 0,
    from: m.change.from ?? 0,
    to: m.change.to ?? 0,
    sparkline: m.sparkline,
    minSample: m.change.min_sample,
  }));

  return (
    <>
      <section className="border-b border-rule">
        <Container className="grid gap-10 pb-14 pt-10 lg:grid-cols-[1.25fr_1fr] lg:gap-16 lg:pb-20 lg:pt-16">
          <div className="flex flex-col justify-center animate-rise">
            <h1 className="display text-[46px] sm:text-[64px] lg:text-[76px]">
              {t('headline')}
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ink-2 sm:text-lg">{t('lede')}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href="/market">{t('ctaMarket')}<ArrowRight aria-hidden /></Link></Button>
              <Button asChild size="lg" variant="outline"><Link href="/onboarding">{t('ctaStart')}</Link></Button>
            </div>
          </div>

          <section aria-labelledby="heat-title" className="flex min-w-0 flex-col animate-rise [animation-delay:80ms]">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <h2 id="heat-title" className="kicker text-ink">{t('heatKicker')}</h2>
              <Link href="/market?type=industry" className="link text-[13px]">{t('heatAll')}</Link>
            </div>
            <HeatmapTiles heatmap={heat} filter={DEFAULT_FILTER} label={t('heatLabel')} />
            <HeatmapLegend heatmap={heat} filter={DEFAULT_FILTER} className="mt-4" />
            <HeatmapTable heatmap={heat} caption={t('heatLabel')} nameHead={tt('industry')} />
          </section>
        </Container>
      </section>

      <Container className="mt-14">
        <SectionHeader kicker={t('signalsKicker')} title={t('signalsTitle')} action={<Link href="/market" className="link text-sm">{t('seeMarket')}</Link>} />
        <p className="-mt-2 mb-4 max-w-3xl text-[13px] text-ink-2">{t('moversRule', { min: movers[0]?.minSample ?? METRICS.change_4w.min_sample })}</p>
        <MoversCarousel items={movers} />
        <p className="mt-3 max-w-2xl text-[13px] text-muted">{t('signalsNote')}</p>
      </Container>

      <Container className="mt-16 grid gap-12 lg:grid-cols-[1.35fr_1fr]">
        <section aria-labelledby="skills-h">
          <SectionHeader id="skills-h" kicker={t('skillsKicker')} title={t('skillsTitle')} action={<MetricInfo metric={skills.metric} type="skill" reading={skills.rows[0]?.metric} filter={DEFAULT_FILTER} />} />
          <div className="divide-y divide-rule border-b border-rule">
            {skills.rows.slice(0, 8).map(snap => (
              <TickerRow key={snap.instrument.id} snap={snap} href={instrumentHref(snap)} action={<WatchButton slug={snap.instrument.slug} filter={DEFAULT_FILTER} metric={skills.metric} labelClassName={ROW_WATCH_LABEL} />} />
            ))}
          </div>
        </section>
        <section aria-labelledby="roles-h">
          <SectionHeader id="roles-h" kicker={t('rolesKicker')} title={t('rolesTitle')} action={<MetricInfo metric="growth_12m" type="role" reading={roles.rows[0]?.metric} filter={DEFAULT_FILTER} />} />
          <ul className="divide-y divide-rule border-b border-rule">
            {[...roles.rows].sort((a, b) => (b.metric.value ?? 0) - (a.metric.value ?? 0)).slice(0, 8).map(snap => (
              <li key={snap.instrument.id} className="relative flex items-center justify-between gap-4 py-3 hover:bg-surface">
                <div className="min-w-0">
                  <Link href={instrumentHref(snap)} className="block truncate font-medium after:absolute after:inset-0">{snap.instrument.name}</Link>
                  <p className="text-[12.5px] text-muted">{snap.instrument.anzsco ? tt('anzsco', { code: snap.instrument.anzsco }) : snap.instrument.category}</p>
                </div>
                <ChangeBadge reading={snap.metric} size="sm" className="items-end text-right" />
              </li>
            ))}
          </ul>
        </section>
      </Container>

      <Container className="mt-20">
        <PractitionerJoinCard />
      </Container>
    </>
  );
}
