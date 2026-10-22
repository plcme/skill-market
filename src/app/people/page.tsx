import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { ArrowRight } from 'lucide-react';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import { getBoard } from '@/lib/queries/market';
import { Button } from '@/components/ui/button';
import { Container, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { StartFromSignal, SupplyStats, type MarketSignal } from '@/features/community/people-client';
import { PractitionerJoinCard } from '@/features/community/practitioner-join-card';
import { ReviewText } from '@/features/dev/copy-review';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('People');
  return { title: t('metaTitle'), description: t('metaDescription') };
}

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

      <Container className="mt-8 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
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
                <p className="mt-2 text-[15px] leading-relaxed text-night-ink/80"><ReviewText id={`people.rules.${r}.body`} proposal="delete" hint="Keep the titles only.">{t(`rules.${r}.body`)}</ReviewText></p>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <Container className="mt-20">
        <PractitionerJoinCard />
      </Container>
    </>
  );
}
