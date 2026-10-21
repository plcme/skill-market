'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { CalendarClock, MapPin } from 'lucide-react';
import type { Candidate } from '@/lib/api/matching';
import type { Practitioner, Slot } from '@/lib/api/types';
import type { FilterSpec, Instrument, MetricReading, Signal } from '@/lib/market/types';
import { METRICS } from '@/lib/metrics/registry';
import { formatChange, formatCount, formatShare } from '@/lib/market/format';
import { instrumentPath } from '@/lib/links';
import { formatDate, formatDateTime, formatTime } from '@/lib/time';
import { Button } from '@/components/ui/button';
import { Avatar, Badge, Card, Monogram } from '@/components/ui/primitives';
import { ChangeBadge } from '@/components/market/change-badge';
import { DirectionGlyph, signDirection } from '@/components/market/direction-glyph';
import { FilterReadback } from '@/components/market/filter-readback';
import { MetricLabel } from '@/components/market/metric-info';
import { SignalTag } from '@/components/market/signal-tag';
import { cn } from '@/lib/utils';
import { locationName, MatchReasons, TopicChips, tzLabel } from './shared';

/** Signal with the absolute numbers behind it (FR-D3). */
export function SignalFigures({ signal, className }: { signal: Pick<Signal, 'kind' | 'metric' | 'from' | 'to' | 'magnitude'>; className?: string }) {
  const t = useTranslations('NewChat');
  const unit = METRICS[signal.metric]?.unit;
  const from = signDirection(signal.from);
  const to = signDirection(signal.to);
  let abs: React.ReactNode;
  if (signal.kind === 'entry_open') abs = t('signalPp', { from: formatShare(signal.from), to: formatShare(signal.to) });
  // Rise/fall signals carry the 4-week ad counts before → after.
  else if (signal.kind === 'rise' || signal.kind === 'fall') abs = t('signalAbs', { from: formatCount(Math.round(signal.from)), to: formatCount(Math.round(signal.to)) });
  else if (unit === 'share') abs = `${formatShare(signal.from)} → ${formatShare(signal.to)}`;
  else if (unit === 'change') abs = <><DirectionGlyph dir={from} />{'\u00a0'}{formatChange(signal.from)} → <DirectionGlyph dir={to} />{'\u00a0'}{formatChange(signal.to)}</>;
  else abs = t('signalAbs', { from: formatCount(Math.round(signal.from)), to: formatCount(Math.round(signal.to)) });
  const dir = signDirection(signal.magnitude);
  return (
    <span className={cn('num text-[13px] text-ink-2', className)}>
      {signal.kind === 'entry_open' ? null : (
        <span className={cn('mr-1.5 font-medium', dir === 'up' && 'text-up', dir === 'down' && 'text-down', dir === 'flat' && 'text-ink')}>
          <DirectionGlyph dir={dir} />{'\u00a0'}{formatChange(signal.magnitude)}
        </span>
      )}
      {abs}
    </span>
  );
}

/** Persistent chat context: what, which market view, which signal, and choices so far. */
export function ContextPanel({ instrument, filter, signal, change, question, practitioner, slot, viewerTz, className }: {
  instrument: Instrument;
  filter: FilterSpec;
  signal: Signal | null;
  change: MetricReading | null;
  question?: string;
  practitioner?: Practitioner | null;
  slot?: Slot | null;
  viewerTz: string;
  className?: string;
}) {
  const t = useTranslations('NewChat');
  return (
    <div className={cn('flex flex-col gap-4 text-sm', className)}>
      <div>
        <p className="kicker">{t('contextInstrument')}</p>
        <Link href={instrumentPath(instrument.type, instrument.slug, filter)} className="group mt-1.5 flex items-center gap-2.5">
          <Monogram tone="ink" size="sm">{instrument.symbol}</Monogram>
          <span className="font-serif text-xl leading-tight group-hover:underline">{instrument.name}</span>
        </Link>
      </div>
      <div>
        <p className="kicker">{t('contextFilter')}</p>
        <FilterReadback filter={filter} className="mt-1 block text-ink-2" />
      </div>
      <div>
        <p className="kicker">{t('contextSignal')}</p>
        {signal ? (
          <div className="mt-1.5 flex flex-col items-start gap-1.5">
            <SignalTag signal={signal} />
            <SignalFigures signal={signal} />
          </div>
        ) : <p className="mt-1 text-muted">{t('contextNoSignal')}</p>}
        {change ? (
          <div className="mt-3 flex flex-col gap-1">
            <MetricLabel metric={change.metric} type={instrument.type} reading={change} filter={filter} short />
            <ChangeBadge reading={change} size="sm" />
          </div>
        ) : null}
      </div>
      {question ? (
        <div>
          <p className="kicker">{t('contextQuestion')}</p>
          <p className="mt-1 whitespace-pre-line break-words text-ink-2">{question}</p>
        </div>
      ) : null}
      {practitioner ? (
        <div>
          <p className="kicker">{t('contextPerson')}</p>
          <p className="mt-1.5 flex items-center gap-2"><Avatar initials={practitioner.initials} size="sm" /><span className="font-medium">{practitioner.display_name}</span></p>
        </div>
      ) : null}
      {slot ? (
        <div>
          <p className="kicker">{t('contextTime')}</p>
          <p className="num mt-1">{formatDateTime(slot.start, viewerTz)}</p>
        </div>
      ) : null}
    </div>
  );
}

/** One matched person (FR-C3): who, why, topics, path, next open times. */
export function CandidateCard({ candidate, viewerTz, selected, onChoose }: {
  candidate: Candidate;
  viewerTz: string;
  selected: boolean;
  onChoose: () => void;
}) {
  const t = useTranslations('Match');
  const p = candidate.practitioner;
  const next = candidate.slots.slice(0, 3);
  return (
    <Card as="article" className={cn('flex flex-col gap-4 p-5 transition-colors', selected && 'border-ink shadow-[inset_0_0_0_1px_var(--ink)]')} aria-label={p.display_name}>
      <header className="flex items-start gap-3">
        <Avatar initials={p.initials} />
        <div className="min-w-0 flex-1">
          {candidate.adjacent_skill ? <Badge tone="warn" className="mb-1">{t('related')}</Badge> : null}
          <h3 className="font-serif text-[22px] leading-tight">{p.display_name}</h3>
          <p className="text-sm text-ink-2">{p.current_title} · {p.employer}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
            <span>{t('since', { year: p.entry_year })}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{locationName(p.location_id)}</span>
          </p>
        </div>
      </header>
      <section>
        <p className="kicker mb-2">{t('reasonsTitle')}</p>
        <MatchReasons reasons={candidate.reasons} compact />
      </section>
      <section>
        <p className="kicker mb-2">{t('topics')}</p>
        <TopicChips topics={p.topics} />
      </section>
      <section>
        <p className="kicker mb-1">{t('path')}</p>
        <p className="text-[13.5px] leading-snug text-ink-2">{p.path}</p>
      </section>
      <section>
        <p className="kicker mb-2 flex items-center gap-1.5"><CalendarClock className="size-3.5" aria-hidden />{t('nextTimes')}</p>
        <ul className="flex flex-wrap gap-1.5">
          {next.map(s => <li key={s.id} className="num rounded-[4px] bg-sunken px-2 py-1 text-[12.5px]">{formatDate(s.start, { weekday: 'short', day: 'numeric', month: 'short' }, viewerTz)} {formatTime(s.start, viewerTz)}</li>)}
          {candidate.slots.length > next.length ? <li className="px-1 py-1 text-[12.5px] text-muted">{t('moreTimes', { n: candidate.slots.length - next.length })}</li> : null}
        </ul>
      </section>
      <div className="mt-auto pt-1">
        <Button variant={selected ? 'primary' : 'outline'} className="w-full" onClick={onChoose} aria-pressed={selected}>
          {selected ? t('chosen') : t('choose', { name: p.display_name.split(' ')[0] })}
        </Button>
      </div>
    </Card>
  );
}

/** Slots grouped by day in the viewer's time zone, practitioner's zone noted (FR-P3). */
export function SlotPicker({ slots, value, onChange, practitioner, viewerTz }: {
  slots: Slot[];
  value: string | null;
  onChange: (slotId: string) => void;
  practitioner: Practitioner;
  viewerTz: string;
}) {
  const t = useTranslations('NewChat');
  const first = practitioner.display_name.split(' ')[0];
  const days = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = formatDate(s.start, { weekday: 'long', day: 'numeric', month: 'long' }, viewerTz);
    days.set(key, [...(days.get(key) ?? []), s]);
  }
  const sample = slots[0]?.start ?? new Date().toISOString();
  const mine = tzLabel(viewerTz, sample);
  const theirs = tzLabel(practitioner.timezone, sample);
  if (!slots.length) return <p className="text-sm text-muted">{t('noTimes', { name: first })}</p>;
  return (
    <div className="flex flex-col gap-5">
      <p className="text-[13px] text-muted">
        {mine === theirs && viewerTz === practitioner.timezone ? t('timeZoneSame', { tz: mine, name: first }) : t('timeZoneNote', { tz: mine, name: first, theirTz: `${locationName(practitioner.location_id)} (${theirs})` })}
      </p>
      {[...days].map(([day, list]) => (
        <fieldset key={day}>
          <legend className="kicker mb-2">{day}</legend>
          <div className="flex flex-wrap gap-2">
            {list.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => onChange(s.id)}
                aria-pressed={value === s.id}
                className={cn(
                  'num h-10 min-w-24 rounded-[5px] border px-3 text-sm transition-colors',
                  value === s.id ? 'border-ink bg-ink text-paper' : 'border-rule bg-surface hover:border-ink/40',
                )}
              >
                {formatTime(s.start, viewerTz)}
              </button>
            ))}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
