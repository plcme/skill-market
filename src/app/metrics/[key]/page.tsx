import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { ArrowLeft, Check, Minus } from 'lucide-react';
import { DEFAULT_FILTER } from '@/lib/filters/spec';
import { SIGNAL_THRESHOLDS } from '@/lib/market/engine';
import { formatCount } from '@/lib/market/format';
import { ACTIVE_INSTRUMENT_TYPES, type MetricKey } from '@/lib/market/types';
import { METRIC_KEYS, METRICS, metricSource } from '@/lib/metrics/registry';
import { getMetricExamples } from '@/lib/queries/market';
import { instrumentPath } from '@/lib/links';
import { Badge, Card, Container, Notice, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { MetricValue } from '@/components/market/metric-value';
import { SourceBadge } from '@/components/market/source-badge';

export const dynamicParams = false;

export function generateStaticParams() {
  return METRIC_KEYS.map(key => ({ key }));
}

function isMetricKey(k: string): k is MetricKey {
  return k in METRICS;
}

export async function generateMetadata({ params }: PageProps<'/metrics/[key]'>): Promise<Metadata> {
  const { key } = await params;
  const tm = await getTranslations('Metrics');
  const t = await getTranslations('MetricPage');
  if (!isMetricKey(key)) return { title: t('indexMetaTitle') };
  return { title: t('metaTitle', { metric: tm(`${key}.label`) }), description: tm(`${key}.definition`) };
}

export default async function MetricPage({ params }: PageProps<'/metrics/[key]'>) {
  const { key } = await params;
  if (!isMetricKey(key)) notFound();
  const t = await getTranslations('MetricPage');
  const tm = await getTranslations('Metrics');
  const tt = await getTranslations('Ticker');
  const def = METRICS[key];
  const examples = getMetricExamples(key, DEFAULT_FILTER);
  const signalUse = key === 'change_4w' ? 'change_4w' : key === 'entry_level_share' ? 'entry_level_share' : key === 'growth_12m' ? 'growth_12m' : 'none';
  const ignores = def.ignores.map(f => tm(f === 'seniority' ? 'ignoresSeniority' : f === 'work_rights' ? 'ignoresWorkRights' : 'ignoresWorkMode'));
  const facts: Array<[string, React.ReactNode]> = [
    [tm('fields.unit'), tm(`${key}.unit`)],
    [tm('fields.denominator'), tm(`${key}.denominator`)],
    [t('factWindow'), t('factWindowValue', { days: def.window_days })],
    [tm('fields.sample'), t('factSample', { min: def.min_sample })],
    [t('factHistory'), def.available_after_days > 0 ? t('factHistoryValue', { days: def.available_after_days }) : t('factHistoryNone')],
    [tm('fields.method'), tm(`${key}.method`)],
  ];
  if (tm.has(`${key}.caveat`)) facts.push([tm('fields.caveat'), tm(`${key}.caveat`)]);
  if (ignores.length) facts.push([t('factIgnores'), ignores.join(' ')]);

  return (
    <Container className="pb-20">
      <nav aria-label={t('breadcrumb')} className="pt-6 text-[13px]">
        <Link href="/metrics" className="inline-flex items-center gap-1.5 text-muted hover:text-ink"><ArrowLeft className="size-3.5" aria-hidden />{t('backToAll')}</Link>
      </nav>
      <PageHeader
        className="pt-4 sm:pt-6"
        kicker={<span className="inline-flex items-center gap-3">{t(`tierKicker.${def.tier}`)}<span className="font-mono normal-case tracking-normal text-faint">{key}</span></span>}
        title={tm(`${key}.label`)}
        lede={tm(`${key}.definition`)}
      />

      <div className="flex flex-wrap items-center gap-2">
        {ACTIVE_INSTRUMENT_TYPES.map(type => {
          const applies = def.applies_to.includes(type);
          return (
            <span key={type} className={applies ? 'inline-flex items-center gap-1.5 rounded-full border border-ink/40 px-3 py-1 text-[13px]' : 'inline-flex items-center gap-1.5 rounded-full border border-dashed border-rule px-3 py-1 text-[13px] text-muted'}>
              {applies ? <Check className="size-3.5" aria-hidden /> : <Minus className="size-3.5" aria-hidden />}
              {t(applies ? 'appliesTo' : 'notFor', { type: applies ? t(`colType.${type}`) : t(`typePlural.${type}`) })}
            </span>
          );
        })}
        {def.default_for.map(dt => <Badge key={dt} tone="ink">{t('defaultFor', { type: t(`typePlural.${dt}`) })}</Badge>)}
        {def.text_derived ? <Badge tone="outline">{t('textBadge')}</Badge> : null}
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section aria-labelledby="def-h">
          <SectionHeader id="def-h" kicker={t('defKicker')} title={t('defTitle')} />
          <dl className="grid grid-cols-1 gap-x-8 border-t border-rule sm:grid-cols-[10rem_1fr]">
            {facts.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="kicker pt-4 sm:border-b sm:border-rule sm:pb-4">{k}</dt>
                <dd className="border-b border-rule pb-4 pt-1.5 text-[15px] text-ink-2 sm:pt-4">{v}</dd>
              </div>
            ))}
            <div className="contents">
              <dt className="kicker pt-4 sm:border-b sm:border-rule sm:pb-4">{tm('fields.source')}</dt>
              <dd className="flex flex-col gap-1.5 border-b border-rule pb-4 pt-1.5 sm:pt-4">
                {def.applies_to.map(type => (
                  <span key={type} className="inline-flex flex-wrap items-center gap-2 text-[14px] text-ink-2">
                    <SourceBadge kind={metricSource(key, type)} />
                    {def.applies_to.length > 1 ? <span className="text-muted">{t('sourceFor', { type: t(`typePlural.${type}`) })}</span> : null}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
          {def.text_derived ? (
            <Notice tone="warn" className="mt-6" title={t('textTitle')}>{t('textBody')}</Notice>
          ) : null}
        </section>

        <div className="flex flex-col gap-12">
          <section aria-labelledby="ex-h">
            <SectionHeader id="ex-h" kicker={t('exKicker')} title={t('exTitle')} />
            <p className="-mt-1 mb-4 text-[13px] text-muted">{t('exNote')}</p>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {examples.map(({ instrument, reading }) => (
                <li key={instrument.id}>
                  <Card className="relative flex h-full flex-col gap-3 p-4 hover:border-ink/30">
                    <div className="flex items-baseline justify-between gap-2">
                      <Link href={`${instrumentPath(instrument.type, instrument.slug)}${def.default_for.includes(instrument.type) ? '' : `?metric=${key}`}`} className="font-medium after:absolute after:inset-0 after:content-['']">{instrument.name}</Link>
                      <span className="kicker">{tt(instrument.type)}</span>
                    </div>
                    <MetricValue reading={reading} size="lg" className="[&>span:last-child]:whitespace-normal" />
                    <p className="num mt-auto text-[12px] text-muted">{t('exSample', { n: formatCount(reading.sample_n) })}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="sig-h">
            <SectionHeader id="sig-h" kicker={t('sigKicker')} title={t('sigTitle')} />
            <p className="text-[15px] leading-relaxed text-ink-2">
              {t(`signalUse.${signalUse}`, { rel: Math.round(SIGNAL_THRESHOLDS.relative * 100), abs: SIGNAL_THRESHOLDS.absolute, pp: Math.round(SIGNAL_THRESHOLDS.entryPp * 100), min: def.min_sample })}
            </p>
          </section>
        </div>
      </div>
    </Container>
  );
}
