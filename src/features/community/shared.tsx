'use client';

import { useEffect, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Check } from 'lucide-react';
import { transact } from '@/lib/demo/store';
import { clockNow } from '@/lib/demo/store';
import { chatJobsDue } from '@/lib/api/chat-jobs';
import { getInstrument } from '@/lib/market/catalog';
import { getDegree, getUniversity } from '@/lib/demo/education';
import { getLocation } from '@/lib/filters/locations';
import { DEFAULT_TZ } from '@/lib/time';
import type { ApiError, DemoDB, MatchReason, StudentField } from '@/lib/api/types';
import { cn } from '@/lib/utils';

/** The viewer's IANA time zone (client only; the store is client only too). */
export function useViewerTz(): string {
  return useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TZ;
    } catch {
      return DEFAULT_TZ;
    }
  }, []);
}

/** Short zone label like "AEST" for an instant. */
export function tzLabel(tz: string, iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-AU', { timeZone: tz, timeZoneName: 'short' }).formatToParts(new Date(iso)).find(p => p.type === 'timeZoneName')?.value ?? tz;
  } catch {
    return tz;
  }
}

/**
 * The preview runs scheduled jobs before each write. When the simulated clock
 * jumps, nudge an empty write so expiries and reminders show without a click.
 */
export function useJobsTick(db: DemoDB | null) {
  const offset = db?.clock_offset_ms;
  useEffect(() => {
    if (!db) return;
    if (chatJobsDue(db, clockNow(db))) transact(() => undefined);
  }, [db, offset]);
}

/** Error key → sentence from `Errors`. */
export function useErrorText(): (error: ApiError | null | undefined) => string | null {
  const t = useTranslations('Errors');
  return (error) => {
    if (!error) return null;
    return t.has(error.message) ? t(error.message) : t('generic');
  };
}

/** One sentence per match factor (FR-C3). */
export function MatchReasons({ reasons, className, compact = false }: { reasons: MatchReason[]; className?: string; compact?: boolean }) {
  const t = useTranslations('Match');
  const tt = useTranslations('Topics');
  return (
    <ul className={cn('flex flex-col gap-1.5', className)}>
      {reasons.map((r, i) => {
        const vars = r.factor === 'topic_overlap' && typeof r.vars.topic === 'string' && tt.has(r.vars.topic) ? { ...r.vars, topic: tt(r.vars.topic) } : r.vars;
        return (
          <li key={`${r.factor}-${i}`} className={cn('flex gap-2 leading-snug text-ink-2', compact ? 'text-[13px]' : 'text-sm')}>
            <Check className={cn('mt-0.5 size-3.5 shrink-0', r.factor === 'adjacent_skill' ? 'text-warn' : 'text-up')} aria-hidden />
            <span>{t(`reasons.${r.factor}`, vars)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function TopicChips({ topics, className }: { topics: string[]; className?: string }) {
  const t = useTranslations('Topics');
  return (
    <ul className={cn('flex flex-wrap gap-1.5', className)}>
      {topics.map(topic => (
        <li key={topic} className="rounded-full border border-rule px-2.5 py-0.5 text-[12.5px] text-ink-2">{t.has(topic) ? t(topic) : topic}</li>
      ))}
    </ul>
  );
}

export function locationName(id: string): string {
  return getLocation(id)?.name ?? id;
}

export function instrumentLabel(slug: string): string {
  return getInstrument(slug)?.name ?? slug;
}

export interface SharedFieldValue {
  field: StudentField;
  value: string | null;
}

/**
 * The student's shared fields as a practitioner sees them (FR-C11). Production
 * reads the snapshot stored on the request; the preview reads the live profile.
 */
export function useSharedFieldValues(db: DemoDB, fields: readonly StudentField[]): SharedFieldValue[] {
  const t = useTranslations('ChatFields');
  const s = db.student;
  return fields.map(field => {
    if (!s) return { field, value: null };
    switch (field) {
      case 'university':
        return { field, value: getUniversity(s.university_id)?.name ?? null };
      case 'degree':
        return { field, value: getDegree(s.degree_id)?.name ?? null };
      case 'year':
        return { field, value: s.year ? t(`years.${s.year}`) : null };
      case 'skills': {
        const names = db.skills.filter(k => k.source !== 'inferred').map(k => instrumentLabel(k.skill_slug));
        return { field, value: names.length ? names.join(', ') : null };
      }
      case 'watchlist': {
        const names = db.watchlist.map(w => instrumentLabel(w.instrument_slug));
        return { field, value: names.length ? names.join(', ') : null };
      }
      case 'visa_status':
        return { field, value: s.visa_status ? t(`visa.${s.visa_status}`) : null };
    }
  });
}

/** Definition list of shared fields. */
export function SharedFieldList({ values, className }: { values: SharedFieldValue[]; className?: string }) {
  const t = useTranslations('ChatFields');
  return (
    <dl className={cn('grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[max-content_1fr]', className)}>
      {values.map(v => (
        <div key={v.field} className="contents">
          <dt className="kicker pt-0.5">{t(v.field)}</dt>
          <dd className={cn('min-w-0 break-words', !v.value && 'text-muted')}>{v.value ?? t('notSet')}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "3h 20m" style remaining time for countdowns (always paired with an absolute time). */
export function hoursLeft(untilIso: string, now: number): number {
  return Math.max(0, Math.round((Date.parse(untilIso) - now) / 3_600_000));
}
