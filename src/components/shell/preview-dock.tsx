'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Clock, FlaskConical, Mail, RotateCcw, UserRound } from 'lucide-react';
import { advanceClock, loadSampleStudent, resetPreview, setPersona, useDB } from '@/lib/demo/store';
import type { OutboxEmail, ViewerRole } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/form';
import { Dialog, DialogTrigger, SheetContent } from '@/components/ui/overlay';
import { useToast } from '@/components/ui/toast';
import { formatDateTime } from '@/lib/time';
import { HOUR } from '@/lib/time';

function OutboxRow({ mail }: { mail: OutboxEmail }) {
  const t = useTranslations('Outbox');
  return (
    <li className="border-b border-rule py-2.5 last:border-0">
      <p className="kicker">{t(`to.${mail.to}`)} · {formatDateTime(mail.at)}</p>
      <p className="mt-0.5 text-sm">{t(`templates.${mail.template}`, mail.vars)}</p>
    </li>
  );
}

/** Controls for the browser-only preview: persona, simulated clock, outbox, reset. */
export function PreviewDock() {
  const t = useTranslations('Preview');
  const tc = useTranslations('Common');
  const db = useDB();
  const { toast } = useToast();
  const [confirmReset, setConfirmReset] = useState(false);
  const role: ViewerRole = db?.session ? db.session.active : 'visitor';
  const offsetH = Math.round((db?.clock_offset_ms ?? 0) / HOUR);
  const outbox = db?.outbox ?? [];
  return (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="no-print fixed bottom-[calc(76px+env(safe-area-inset-bottom))] left-3 z-30 inline-flex h-9 items-center gap-2 rounded-full border border-ink/15 bg-surface/95 pl-2.5 pr-3.5 text-[12.5px] font-medium shadow-float backdrop-blur transition hover:border-ink/40 md:bottom-5 md:left-auto md:right-5"
        >
          <FlaskConical className="size-4 text-accent" aria-hidden />
          <span>{t('label')}</span>
          <span className="kicker hidden sm:inline">{t(role)}</span>
          {offsetH ? <span className="rounded-[3px] bg-signal px-1 font-mono text-[10.5px] text-signal-ink">{t('clockOffset', { hours: offsetH })}</span> : null}
        </button>
      </DialogTrigger>
      <SheetContent title={t('title')} description={t('description')} closeLabel={tc('close')}>
        <section className="flex flex-col gap-3">
          <h3 className="kicker flex items-center gap-2"><UserRound className="size-3.5" aria-hidden />{t('viewAs')}</h3>
          <Segmented<ViewerRole>
            label={t('viewAs')}
            value={role}
            onValueChange={v => setPersona(v === 'visitor' ? null : v)}
            options={(['visitor', 'student', 'practitioner', 'admin'] as const).map(v => ({ value: v, label: t(v) }))}
            className="flex w-full [&>*]:flex-1"
          />
          <button type="button" onClick={() => { loadSampleStudent(); toast({ tone: 'success', title: t('sampleStudent') }); }} className="rounded-md border border-rule bg-paper px-4 py-3 text-left hover:border-ink/40">
            <span className="block text-sm font-medium">{t('sampleStudent')}</span>
            <span className="block text-[13px] text-muted">{t('sampleStudentHint')}</span>
          </button>
        </section>
        <section className="mt-7 flex flex-col gap-3">
          <h3 className="kicker flex items-center gap-2"><Clock className="size-3.5" aria-hidden />{t('clock')}</h3>
          <p className="text-[13px] text-muted">{t('clockHint')}</p>
          <div className="flex flex-wrap items-center gap-2">
            <span className="serif-num mr-2 text-2xl">{t('clockOffset', { hours: offsetH })}</span>
            {[1, 24, 72, 168].map(h => (
              <Button key={h} variant="subtle" size="sm" onClick={() => advanceClock(h)}>{t('advance', { hours: h })}</Button>
            ))}
          </div>
        </section>
        <section className="mt-7">
          <h3 className="kicker flex items-center gap-2"><Mail className="size-3.5" aria-hidden />{t('outbox')}<span className="ml-auto normal-case tracking-normal">{t('outboxCount', { n: outbox.length })}</span></h3>
          {outbox.length ? (
            <ul className="mt-2 max-h-72 overflow-y-auto">{[...outbox].reverse().slice(0, 30).map(m => <OutboxRow key={m.id} mail={m} />)}</ul>
          ) : <p className="mt-2 text-[13px] text-muted">{t('outboxEmpty')}</p>}
        </section>
        <section className="mt-8 border-t border-rule pt-5">
          {confirmReset ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">{t('resetConfirm')}</p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={() => { resetPreview(); setConfirmReset(false); toast({ title: t('resetDone') }); }}>{t('reset')}</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>{tc('cancel')}</Button>
              </div>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmReset(true)}><RotateCcw aria-hidden />{t('reset')}</Button>
          )}
        </section>
      </SheetContent>
    </Dialog>
  );
}
