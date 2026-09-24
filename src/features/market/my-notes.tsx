'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useDB } from '@/lib/demo/store';
import { selectDebriefsFor } from '@/lib/api/chat';
import { formatDate } from '@/lib/time';
import { SectionHeader } from '@/components/ui/primitives';
import { SourceBadge } from '@/components/market/source-badge';

/** FR-R1: debrief votes are recorded under the instrument, visible only to the student. */
export function MyNotes({ slug, name }: { slug: string; name: string }) {
  const t = useTranslations('MyNotes');
  const tc = useTranslations('Chat');
  const db = useDB();
  if (!db?.session || db.session.active !== 'student') return null;
  const notes = selectDebriefsFor(db, slug);
  if (!notes.length) return null;
  return (
    <section id="notes" aria-labelledby="notes-h" className="mt-16 scroll-mt-24">
      <SectionHeader id="notes-h" kicker={t('kicker')} title={t('title', { name })} action={<SourceBadge kind="practitioner" />} />
      <ul className="divide-y divide-rule border-b border-rule">
        {notes.map(r => {
          const p = db.practitioners.find(x => x.id === r.practitioner_id);
          return (
            <li key={r.id} className="grid gap-1 py-4 sm:grid-cols-[180px_1fr_auto] sm:gap-6">
              <p className="kicker pt-0.5">{formatDate(r.slot_start)}</p>
              <div>
                <p className="font-serif text-lg">{r.debrief ? tc(`vote.${r.debrief.vote}`, { instrument: name }) : null}</p>
                {r.debrief?.note ? <p className="mt-1 text-sm text-ink-2">{r.debrief.note}</p> : null}
                <p className="mt-1 text-[13px] text-muted">{t('with', { name: p?.display_name ?? '' })}</p>
              </div>
              <Link href={`/chat/${r.id}`} className="link text-sm">{t('open')}</Link>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[13px] text-muted">{t('private')}</p>
    </section>
  );
}
