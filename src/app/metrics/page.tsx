import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Check, Minus } from 'lucide-react';
import { ACTIVE_INSTRUMENT_TYPES, type MetricKey } from '@/lib/market/types';
import { METRIC_KEYS, METRICS, type MetricTier } from '@/lib/metrics/registry';
import { Badge, Container, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { SourceMark } from '@/components/market/source-badge';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('MetricPage');
  return { title: t('indexMetaTitle'), description: t('indexMetaDescription') };
}

const TIERS: MetricTier[] = ['common', 'advanced'];

export default async function MetricsIndexPage() {
  const t = await getTranslations('MetricPage');
  const tm = await getTranslations('Metrics');
  const ts = await getTranslations('Sources');
  const byTier = (tier: MetricTier): MetricKey[] => METRIC_KEYS.filter(k => METRICS[k].tier === tier);

  return (
    <Container className="pb-20">
      <PageHeader kicker={t('indexKicker')} title={t('indexTitle')} lede={t('indexLede')} />
      <ul className="mb-10 flex flex-wrap gap-x-6 gap-y-2 text-[13px] text-ink-2">
        <li className="inline-flex items-center gap-2"><Check className="size-4 text-ink" aria-hidden />{t('legendApplies')}</li>
        <li className="inline-flex items-center gap-2"><Minus className="size-4 text-faint" aria-hidden />{t('legendNot')}</li>
        <li className="inline-flex items-center gap-2"><Badge tone="ink">{t('defaultBadge')}</Badge>{t('legendDefault')}</li>
        <li className="inline-flex items-center gap-2"><Badge tone="outline">{t('textBadge')}</Badge>{t('legendText')}</li>
      </ul>
      {TIERS.map(tier => (
        <section key={tier} aria-labelledby={`tier-${tier}`} className="mb-14">
          <SectionHeader id={`tier-${tier}`} kicker={t(`tierKicker.${tier}`)} title={t(`tierTitle.${tier}`)} />
          <p className="-mt-1 mb-4 max-w-2xl text-[13px] text-muted">{t(`tierNote.${tier}`)}</p>
          <table className="w-full border-collapse text-left">
            <caption className="sr-only">{t('tableCaption', { tier: t(`tierTitle.${tier}`) })}</caption>
            <thead>
              <tr className="border-b border-rule-strong">
                <th scope="col" className="kicker py-2 pr-4 font-normal">{t('colMetric')}</th>
                {ACTIVE_INSTRUMENT_TYPES.map(type => (
                  <th key={type} scope="col" className="kicker w-16 py-2 text-center font-normal sm:w-24">{t(`colType.${type}`)}</th>
                ))}
                <th scope="col" className="kicker hidden w-44 py-2 pl-4 font-normal md:table-cell">{t('colSource')}</th>
              </tr>
            </thead>
            <tbody>
              {byTier(tier).map(k => {
                const def = METRICS[k];
                return (
                  <tr key={k} className="border-b border-rule align-top hover:bg-surface">
                    <th scope="row" className="py-4 pr-4 font-normal">
                      <Link href={`/metrics/${k}`} className="font-serif text-[20px] leading-tight text-ink hover:underline">{tm(`${k}.label`)}</Link>
                      <span className="ml-2 font-mono text-[11px] text-faint">{k}</span>
                      <p className="mt-1 max-w-xl text-[13.5px] text-ink-2">{tm(`${k}.definition`)}</p>
                      <p className="mt-2 flex flex-wrap gap-1.5">
                        {def.default_for.map(dt => <Badge key={dt} tone="ink">{t('defaultFor', { type: t(`typePlural.${dt}`) })}</Badge>)}
                        {def.text_derived ? <Badge tone="outline">{t('textBadge')}</Badge> : null}
                        {def.available_after_days > 0 ? <Badge tone="neutral">{t('needsHistory', { days: def.available_after_days })}</Badge> : null}
                      </p>
                    </th>
                    {ACTIVE_INSTRUMENT_TYPES.map(type => {
                      const applies = def.applies_to.includes(type);
                      return (
                        <td key={type} className="py-4 text-center">
                          {applies ? <Check className="mx-auto size-4 text-ink" aria-hidden /> : <Minus className="mx-auto size-4 text-faint" aria-hidden />}
                          <span className="sr-only">{t(applies ? 'srApplies' : 'srNot', { type: t(`typePlural.${type}`) })}</span>
                        </td>
                      );
                    })}
                    <td className="hidden py-4 pl-4 text-[13px] text-ink-2 md:table-cell">
                      <ul className="flex flex-col gap-1">
                        {[...new Set(def.applies_to.map(type => def.source[type] ?? 'ads'))].map(src => (
                          <li key={src} className="inline-flex items-center gap-1.5"><SourceMark kind={src} />{ts(`kinds.${src}`)}</li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      ))}
      <p className="max-w-2xl text-[13px] text-muted">
        {t('indexFooter')}{' '}
        <Link href="/sources" className="link">{t('sourcesLink')}</Link>
      </p>
    </Container>
  );
}
