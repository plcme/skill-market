'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { SearchX } from 'lucide-react';
import { selectRequest } from '@/lib/api/chat';
import { clockNow, setPersona, useDB } from '@/lib/demo/store';
import type { DemoDB } from '@/lib/api/types';
import { RequireSession } from '@/components/shell/require-session';
import { Button } from '@/components/ui/button';
import { Avatar, Card, Container, EmptyState, PageHeader, SectionHeader } from '@/components/ui/primitives';
import { SignalTag } from '@/components/market/signal-tag';
import { FilterReadback } from '@/components/market/filter-readback';
import { SignalFigures } from './chat-parts';
import { EventHistory } from './history';
import { PractitionerView } from './practitioner-view';
import { SafetyActions } from './safety';
import { StudentView } from './student-view';
import { instrumentLabel, locationName, MatchReasons, SharedFieldList, useJobsTick, useSharedFieldValues, useViewerTz } from './shared';

/** /chat/[id] — either side of a request, depending on who is looking. */
export function RequestPage({ id }: { id: string }) {
  return <RequireSession>{db => <Body db={db} id={id} />}</RequireSession>;
}

function Body({ db, id }: { db: DemoDB; id: string }) {
  const t = useTranslations('Chat');
  const tg = useTranslations('Guard');
  useJobsTick(useDB());
  const viewerTz = useViewerTz();
  const now = clockNow(db);
  const view = selectRequest(db, id);
  const raw = db.requests.find(r => r.id === id);

  if (!view) {
    const ownsAsStudent = raw && raw.student_id === db.session?.user_id && db.session?.active !== 'student';
    return (
      <Container className="py-16">
        <EmptyState
          icon={SearchX}
          title={ownsAsStudent ? t('otherPersona', { persona: tg('personas.student') }) : t('notFoundTitle')}
          action={ownsAsStudent
            ? <Button onClick={() => setPersona('student')}>{t('switchPersona', { persona: tg('personas.student') })}</Button>
            : <Button asChild variant="subtle"><Link href={db.session?.active === 'practitioner' ? '/practitioner' : '/me/requests'}>{db.session?.active === 'practitioner' ? t('toDesk') : t('toRequests')}</Link></Button>}
        >
          {ownsAsStudent ? null : t('notFoundBody')}
        </EmptyState>
      </Container>
    );
  }

  const req = view.request;
  const p = view.practitioner;
  const instrument = instrumentLabel(req.instrument_slug);
  const isStudent = view.viewer === 'student';
  const studentName = db.student?.display_name.split(' ')[0] ?? db.session?.display_name.split(' ')[0] ?? '';
  const otherName = isStudent ? (p?.display_name.split(' ')[0] ?? '') : studentName;
  const replacementName = view.replacement ? db.practitioners.find(x => x.id === view.replacement?.practitioner_id)?.display_name.split(' ')[0] : null;

  return (
    <Container className="pb-24">
      <PageHeader
        kicker={isStudent ? t('kicker', { name: instrument }) : t('pTitleKicker', { name: studentName })}
        title={isStudent ? t('titleStudent', { instrument, name: otherName }) : t('titlePractitioner', { instrument, name: studentName })}
      />
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-14">
        <div className="flex min-w-0 flex-col gap-10">
          {isStudent
            ? <StudentView db={db} view={view} now={now} viewerTz={viewerTz} />
            : <PractitionerView db={db} view={view} now={now} viewerTz={viewerTz} />}
          <RequestSummary db={db} view={view} studentName={studentName} />
        </div>
        <aside className="flex flex-col gap-8">
          {isStudent && p ? (
            <Card className="p-5">
              <div className="flex items-start gap-3">
                <Avatar initials={p.initials} />
                <div className="min-w-0">
                  <p className="font-serif text-xl leading-tight">{p.display_name}</p>
                  <p className="text-sm text-ink-2">{p.current_title} · {p.employer}</p>
                  <p className="text-[13px] text-muted">{locationName(p.location_id)}</p>
                </div>
              </div>
            </Card>
          ) : null}
          <section>
            <SectionHeader as="h2" title={t('safetyTitle')} className="pb-2" />
            <p className="mb-3 text-[13px] text-muted">{t('safetyBody')}</p>
            <SafetyActions
              db={db}
              targetKind={isStudent ? 'practitioner' : 'student'}
              targetId={isStudent ? req.practitioner_id : req.student_id}
              targetName={otherName}
              requestId={req.id}
            />
          </section>
          <section>
            <SectionHeader as="h2" title={t('historyTitle')} className="pb-3" />
            <EventHistory events={view.events} viewer={view.viewer} otherName={otherName} viewerTz={viewerTz} replacementName={replacementName} />
          </section>
        </aside>
      </div>
    </Container>
  );
}

/** What was sent: decision, openers, shared fields, reasons, signal. */
function RequestSummary({ db, view, studentName }: { db: DemoDB; view: NonNullable<ReturnType<typeof selectRequest>>; studentName: string }) {
  const t = useTranslations('Chat');
  const req = view.request;
  const isStudent = view.viewer === 'student';
  const pName = view.practitioner?.display_name.split(' ')[0] ?? '';
  const values = useSharedFieldValues(db, req.shared_fields);
  return (
    <section className="flex flex-col gap-6">
      <SectionHeader as="h2" title={t('requestTitle')} />
      <div>
        <p className="kicker mb-1.5">{isStudent ? t('questionLabel') : t('pDecision')}</p>
        <p className="font-serif text-xl leading-snug">{req.decision_question}</p>
      </div>
      <div>
        <p className="kicker mb-2">{isStudent ? t('signalLabel') : t('pSignal')}</p>
        {req.signal ? (
          <div className="flex flex-wrap items-center gap-2"><SignalTag signal={req.signal} /><SignalFigures signal={req.signal} /></div>
        ) : null}
        <FilterReadback filter={req.filter} className="mt-1.5 block text-sm text-ink-2" />
      </div>
      <div>
        <p className="kicker mb-2">{isStudent ? t('startersLabel') : t('pStarters')}</p>
        <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-ink-2">
          {req.starters.map((s, i) => <li key={i}>{s}</li>)}
        </ol>
      </div>
      <div>
        <p className="kicker mb-2">{isStudent ? t('matchLabel', { name: pName }) : t('pWhy')}</p>
        <MatchReasons reasons={req.match_reasons} />
      </div>
      <div>
        <p className="kicker mb-2">{isStudent ? t('sharedLabel', { name: pName }) : t('pShared', { name: studentName })}</p>
        {values.length ? <SharedFieldList values={values} /> : <p className="text-sm text-muted">{isStudent ? t('sharedNone') : t('pSharedNone', { name: studentName })}</p>}
      </div>
    </section>
  );
}
