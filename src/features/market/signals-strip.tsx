import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, MessageCircle } from 'lucide-react';
import { chatHref, instrumentPath } from '@/lib/links';
import type { FilterSpec, InstrumentSnapshot } from '@/lib/market/types';
import { Monogram } from '@/components/ui/primitives';
import { SignalTag } from '@/components/market/signal-tag';
import { cn } from '@/lib/utils';
import { useSignalMove } from './signal-copy';

/**
 * FR-M6 "30-second" view: what moved under the current filter, each with a
 * direct route to the detail page and to a conversation.
 */
export function SignalsStrip({ rows, filter, className }: { rows: InstrumentSnapshot[]; filter: FilterSpec; className?: string }) {
  const t = useTranslations('MarketPage');
  const tt = useTranslations('Ticker');
  const move = useSignalMove();
  return (
    <section aria-labelledby="signals-now-h" className={cn('border-y border-rule py-4', className)}>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 id="signals-now-h" className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-[2px] bg-signal ring-1 ring-ink/15" aria-hidden />
          <span className="kicker text-ink">{t('signalsNow')}</span>
          <span className="num text-[12.5px] text-muted">{t('signalsNowCount', { n: rows.length })}</span>
        </h2>
        <p className="text-[12.5px] text-muted">{t('signalsNowNote')}</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-ink-2">{t('signalsNowEmpty')}</p>
      ) : (
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 scrollbar-none sm:mx-0 sm:px-0">
          {rows.map(snap => {
            const signal = snap.signal;
            if (!signal) return null;
            const { instrument } = snap;
            return (
              <li key={instrument.id} className="relative flex w-[248px] shrink-0 snap-start flex-col gap-2 rounded-md border border-rule bg-surface p-3 transition-colors hover:border-ink/30">
                <div className="flex items-center justify-between gap-2">
                  <SignalTag signal={signal} />
                  <span className="kicker">{tt(instrument.type)}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Monogram size="sm" tone="signal">{instrument.symbol}</Monogram>
                  <Link
                    href={instrumentPath(instrument.type, instrument.slug, filter)}
                    className="min-w-0 truncate font-medium after:absolute after:inset-0 after:rounded-md after:content-[''] focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-accent"
                  >
                    {instrument.name}
                  </Link>
                </div>
                <p className="num text-[12.5px] leading-snug text-ink-2">{move(signal)}</p>
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-rule pt-2">
                  <Link href={chatHref(instrument.slug, filter, signal.kind)} aria-label={t('signalsNowTalkLabel', { name: instrument.name })} className="relative z-10 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-accent hover:underline">
                    <MessageCircle className="size-3.5" aria-hidden />
                    {t('signalsNowTalk')}
                  </Link>
                  <ArrowUpRight className="size-3.5 text-muted" aria-hidden />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
