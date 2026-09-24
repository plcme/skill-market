import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import { getBoard } from '@/lib/queries/market';
import { Button } from '@/components/ui/button';
import { Container, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { PractitionerCta, StartFromSignal, SupplyStats, type MarketSignal } from '@/features/community/people-client';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('People');
  return { title: t('metaTitle'), description: t('metaDescription') };
}

const STEPS = ['signal', 'match', 'chat', 'debrief'] as const;
const RULES = ['optIn', 'window', 'noShow', 'safety'] as const;

export default async function PeoplePage() {
  const t = await getTranslations('People');
  const board = getBoard({ type: 'all', filter: DEFAULT_FILTER, sort: 'change' });
  const market: MarketSignal[] = board.rows
    .filter(r => r.signal)
    .slice(0, 6)
    .map(r => ({ slug: r.instrument.slug, name: r.instrument.name, symbol: r.instrument.symbol, signal: r.signal! }));

  return (
    <>
      <Container>
        <PageHeader
          kicker={t('kicker')}
          title={t('title')}
          lede={t('lede')}
          actions={<><Button asChild size="lg"><a href="#start">{t('ctaStart')}<ArrowRight aria-hidden /></a></Button><Button asChild size="lg" variant="ghost"><Link href="/me/requests">{t('ctaRequests')}</Link></Button></>}
        />
      </Container>

      <Container className="mt-8">
        <SectionHeader kicker={t('howKicker')} title={t('howTitle')} />
        <ol className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-col gap-2">
              <span aria-hidden data-n={String(i + 1).padStart(2, '0')} className="serif-num text-[52px] leading-none text-ink/15 before:content-[attr(data-n)]" />
              <h3 className="font-serif text-[22px] leading-snug">{t(`steps.${s}.title`)}</h3>
              <p className="text-[15px] text-ink-2">{t(`steps.${s}.body`)}</p>
            </li>
          ))}
        </ol>
      </Container>

      <Container className="mt-16 grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section id="start" aria-labelledby="start-h" className="scroll-mt-24">
          <SectionHeader id="start-h" kicker={t('startKicker')} title={t('startTitle')} />
          <StartFromSignal market={market} />
        </section>
        <section aria-labelledby="supply-h">
          <SectionHeader id="supply-h" kicker={t('supplyKicker')} title={t('supplyTitle')} />
          <SupplyStats />
        </section>
      </Container>

      <section className="mt-20 bg-night text-night-ink">
        <Container className="grid gap-10 py-16 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="kicker text-night-ink/60">{t('rulesKicker')}</p>
            <h2 className="display mt-4 text-[38px] sm:text-[48px]">{t('rulesTitle')}</h2>
            <div className="mt-6 flex flex-wrap gap-4 text-sm">
              <Link href="/legal/reliability" className="underline underline-offset-4">{t('rulesLink')}</Link>
              <Link href="/legal/conduct" className="underline underline-offset-4">{t('conductLink')}</Link>
            </div>
          </div>
          <ul className="grid gap-px overflow-hidden rounded-md bg-night-ink/15 sm:grid-cols-2">
            {RULES.map(r => (
              <li key={r} className="bg-night p-6">
                <h3 className="font-serif text-xl">{t(`rules.${r}.title`)}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-night-ink/80">{t(`rules.${r}.body`)}</p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="mt-20">
        <div className="grid gap-6 rounded-lg border border-rule bg-surface p-6 sm:p-10 md:grid-cols-[1.4fr_auto] md:items-end">
          <div>
            <p className="kicker">{t('joinKicker')}</p>
            <h2 className="mt-3 font-serif text-[30px] leading-tight sm:text-[36px]">{t('joinTitle')}</h2>
            <p className="mt-3 max-w-2xl text-ink-2">{t('joinBody')}</p>
          </div>
          <PractitionerCta />
        </div>
      </Container>
    </>
  );
}
