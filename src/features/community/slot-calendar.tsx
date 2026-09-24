'use client';

import { useTranslations } from 'next-intl';
import { selectPractitionerSlots } from '@/lib/api/practitioner';
import type { DemoDB, Practitioner, Slot } from '@/lib/api/types';
import { formatDate, formatTime } from '@/lib/time';
import { cn } from '@/lib/utils';

/** Generated 20-minute times for the next two weeks, by day, in the practitioner's zone. */
export function SlotCalendar({ db, practitioner, now }: { db: DemoDB; practitioner: Practitioner; now: number }) {
  const t = useTranslations('Availability');
  const slots = selectPractitionerSlots(db, practitioner.id, now);
  const days = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = formatDate(s.start, { weekday: 'short', day: 'numeric', month: 'short' }, practitioner.timezone);
    days.set(key, [...(days.get(key) ?? []), s]);
  }
  return (
    <div className="mt-8">
      <p className="kicker mb-3">{t('upcomingTitle')}</p>
      {slots.length ? (
        <ul className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {[...days].map(([day, list]) => (
            <li key={day} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 border-b border-rule pb-2">
              <span className="w-24 shrink-0 text-[13px] font-medium">{day}</span>
              {list.map(s => (
                <span
                  key={s.id}
                  className={cn('num rounded-[3px] px-1.5 py-0.5 text-[12px]', s.status === 'open' ? 'bg-sunken text-ink-2' : s.status === 'held' ? 'bg-signal text-signal-ink' : 'bg-ink text-paper')}
                  title={t(s.status === 'open' ? 'slotOpen' : s.status === 'held' ? 'slotHeld' : 'slotBooked')}
                >
                  {formatTime(s.start, practitioner.timezone)}
                  <span className="sr-only"> {t(s.status === 'open' ? 'slotOpen' : s.status === 'held' ? 'slotHeld' : 'slotBooked')}</span>
                </span>
              ))}
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-muted">{t('noSlots')}</p>}
      <p className="mt-3 flex flex-wrap gap-3 text-[12px] text-muted">
        <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-[2px] bg-sunken" aria-hidden />{t('slotOpen')}</span>
        <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-[2px] bg-signal" aria-hidden />{t('slotHeld')}</span>
        <span className="inline-flex items-center gap-1"><span className="size-2.5 rounded-[2px] bg-ink" aria-hidden />{t('slotBooked')}</span>
      </p>
    </div>
  );
}
