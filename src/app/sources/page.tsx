import type { Metadata } from 'next';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { Ban, CircleAlert, CircleCheck, CircleX } from 'lucide-react';
import { SIGNAL_THRESHOLDS } from '@/lib/market/engine';
import type { SourceKind } from '@/lib/market/types';
import { METRIC_KEYS, METRICS, MIN_SAMPLE_DEFAULT } from '@/lib/metrics/registry';
import { getSources } from '@/lib/queries/market';
import { formatDate } from '@/lib/time';
import { Badge, Card, Container, Notice, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { SourceBadge, SourceMark } from '@/components/market/source-badge';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('SourcesPage');
  return { title: t('metaTitle'), description: t('metaDescription') };
}

const KINDS: SourceKind[] = ['official', 'ads', 'practitioner'];
const SECTIONS = ['sources', 'kinds', 'cells', 'sample', 'text', 'signals', 'never'] as const;
const STATUS_ICON = { healthy: CircleCheck, delayed: CircleAlert, failed: CircleX } as const;

export default async function SourcesPage() {
  const t = await getTranslations('SourcesPage');
  const ts = await getTranslations('Sources');
  const tm = await getTranslations('Metrics');
  const sources = getSources();
  const textDerived = METRIC_KEYS.filter(k => METRICS[k].text_derived);

  return (
    <Container className="pb-20">
      <PageHeader kicker={t('kicker')} title={t('title')} lede={t('lede')} />
      <Notice tone="warn" title={ts('illustrative')} className="max-w-3xl">{ts('illustrativeLong')} {t('illustrativeMore')}</Notice>

      <div className="mt-12 grid gap-12 lg:grid-cols-[200px_minmax(0,1fr)] lg:gap-16">
        <nav aria-label={t('tocLabel')} className="hidden lg:block">
          <ol className="sticky top-24 flex flex-col gap-2 border-l border-rule pl-4 text-[13px]">
            {SECTIONS.map(s => <li key={s}><a href={`#${s}`} className="text-muted hover:text-ink">{t(`toc.${s}`)}</a></li>)}
          </ol>
        </nav>

        <div className="flex min-w-0 flex-col gap-16">
          <section id="sources" aria-labelledby="sources-h" className="scroll-mt-24">
            <SectionHeader id="sources-h" kicker={t('sourcesKicker')} title={t('sourcesTitle')} />
            <ul className="divide-y divide-rule border-y border-rule">
              {sources.map(s => {
                const Icon = STATUS_ICON[s.status];
                return (
                  <li key={s.id} className="grid gap-3 py-5 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:gap-8">
                    <div className="min-w-0">
                      <SourceBadge kind={s.kind} />
                      <p className="mt-1.5 font-serif text-[21px] leading-snug">{s.name}</p>
                      <p className="mt-1 text-[13.5px] text-ink-2">{t(`use.${s.kind}`)}</p>
                    </div>
                    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
                      <dt className="kicker pt-0.5">{t('licence')}</dt><dd className="text-ink-2">{s.licence}</dd>
                      <dt className="kicker pt-0.5">{t('cadence')}</dt><dd className="text-ink-2">{s.cadence}</dd>
                      <dt className="kicker pt-0.5">{t('lastRun')}</dt><dd className="num text-ink-2">{formatDate(s.last_run_at, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</dd>
                    </dl>
                    <p className={cn('inline-flex h-fit items-center gap-1.5 self-start text-[13px] font-medium', s.status === 'healthy' && 'text-success', s.status === 'delayed' && 'text-warn', s.status === 'failed' && 'text-danger')}>
                      <Icon className="size-4" aria-hidden />{t(`status.${s.status}`)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          <section id="kinds" aria-labelledby="kinds-h" className="scroll-mt-24">
            <SectionHeader id="kinds-h" kicker={t('kindsKicker')} title={t('kindsTitle')} />
            <p className="-mt-1 mb-5 max-w-2xl text-[15px] text-ink-2">{t('kindsLede')}</p>
            <ul className="grid gap-3 md:grid-cols-3">
              {KINDS.map(k => (
                <li key={k}>
                  <Card className="flex h-full flex-col gap-3 p-5">
                    <SourceMark kind={k} className="size-5" />
                    <p className="font-serif text-[20px] leading-tight">{ts(`kinds.${k}`)}</p>
                    <p className="kicker">{t(`shape.${k}`)}</p>
                    <p className="text-[13.5px] text-ink-2">{t(`kindBody.${k}`)}</p>
                  </Card>
                </li>
              ))}
            </ul>
          </section>

          <section id="cells" aria-labelledby="cells-h" className="scroll-mt-24">
            <SectionHeader id="cells-h" kicker={t('cellsKicker')} title={t('cellsTitle')} />
            <div className="grid max-w-3xl gap-4 text-[15px] leading-relaxed text-ink-2">
              <p>{t('cells1')}</p>
              <ol className="grid gap-2 sm:grid-cols-2">
                {(['place', 'mode', 'level', 'rights'] as const).map((k, i) => (
                  <li key={k} className="flex gap-3 rounded-md border border-rule bg-surface p-3.5">
                    <span className="serif-num text-[22px] leading-none text-faint">{i + 1}</span>
                    <span><span className="font-medium text-ink">{t(`cell.${k}`)}</span><span className="mt-0.5 block text-[13px] text-muted">{t(`cellHint.${k}`)}</span></span>
                  </li>
                ))}
              </ol>
              <p>{t('cells2')}</p>
              <p className="rounded-md bg-signal-soft px-4 py-3 text-[14px] text-ink">{t('cellsExample')}</p>
              <p>{t('cells3')}</p>
            </div>
          </section>

          <section id="sample" aria-labelledby="sample-h" className="scroll-mt-24">
            <SectionHeader id="sample-h" kicker={t('sampleKicker')} title={t('sampleTitle', { min: MIN_SAMPLE_DEFAULT })} />
            <div className="grid max-w-3xl gap-4 text-[15px] leading-relaxed text-ink-2">
              <p>{t('sample1', { min: MIN_SAMPLE_DEFAULT })}</p>
              <p>{t('sample2', { premium: METRICS.skill_premium.min_sample })}</p>
            </div>
          </section>

          <section id="text" aria-labelledby="text-h" className="scroll-mt-24">
            <SectionHeader id="text-h" kicker={t('textKicker')} title={t('textTitle')} />
            <p className="-mt-1 mb-5 max-w-3xl text-[15px] leading-relaxed text-ink-2">{t('textLede')}</p>
            <ul className="divide-y divide-rule border-y border-rule">
              {textDerived.map(k => (
                <li key={k} className="grid gap-2 py-4 md:grid-cols-[minmax(0,14rem)_minmax(0,1fr)] md:gap-8">
                  <div>
                    <Link href={`/metrics/${k}`} className="font-medium hover:underline">{tm(`${k}.label`)}</Link>
                    <p className="mt-1"><Badge tone="outline">{t('textBadge')}</Badge></p>
                  </div>
                  <div className="text-[14px] text-ink-2">
                    <p><span className="kicker mr-2">{tm('fields.method')}</span>{tm(`${k}.method`)}</p>
                    <p className="mt-1.5"><span className="kicker mr-2">{tm('fields.caveat')}</span>{tm.has(`${k}.caveat`) ? tm(`${k}.caveat`) : t('noKnownError')}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-4 max-w-3xl text-[13px] text-muted">{t('textFoot')}</p>
          </section>

          <section id="signals" aria-labelledby="signals-h" className="scroll-mt-24">
            <SectionHeader id="signals-h" kicker={t('signalsKicker')} title={t('signalsTitle')} />
            <dl className="grid gap-3 md:grid-cols-3">
              {(['rise', 'fall', 'entry_open'] as const).map(k => (
                <Card key={k} className="p-5">
                  <dt><span className="inline-flex rounded-[3px] bg-signal px-1.5 py-0.5 text-[11.5px] font-medium text-signal-ink">{t(`signal.${k}`)}</span></dt>
                  <dd className="mt-3 text-[14px] text-ink-2">
                    {t(`signalRule.${k}`, { rel: Math.round(SIGNAL_THRESHOLDS.relative * 100), abs: SIGNAL_THRESHOLDS.absolute, pp: Math.round(SIGNAL_THRESHOLDS.entryPp * 100), min: MIN_SAMPLE_DEFAULT })}
                  </dd>
                </Card>
              ))}
            </dl>
            <p className="mt-4 max-w-3xl text-[13px] text-muted">{t('signalsFoot')}</p>
          </section>

          <section id="never" aria-labelledby="never-h" className="scroll-mt-24">
            <SectionHeader id="never-h" kicker={t('neverKicker')} title={t('neverTitle')} />
            <div className="grid max-w-3xl gap-4 text-[15px] leading-relaxed text-ink-2">
              <ul className="flex flex-col gap-2">
                {(['n1', 'n2', 'n3'] as const).map(k => (
                  <li key={k} className="flex gap-3"><Ban className="mt-1 size-4 shrink-0 text-danger" aria-hidden />{t(`never.${k}`)}</li>
                ))}
              </ul>
              <p>{t('neverFoot')}</p>
            </div>
          </section>
        </div>
      </div>
    </Container>
  );
}
