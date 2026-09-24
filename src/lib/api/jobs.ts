import type { DemoDB, Practitioner, Slot } from './types';
import { runChatJobs } from './chat-jobs';
import { addDaysYmd, DAY, zonedDay, zonedToUtc } from '@/lib/time';

// The preview's stand-in for pg_cron (ARCHITECTURE §5.4). Runs before every
// read/write so simulated time behaves as if the jobs had already fired.

export const SLOT_HORIZON_DAYS = 28;
export const SLOT_MINUTES = 20;
const SLOT_STEP_MINUTES = 30;

function minutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function hhmm(total: number): string {
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Expand a weekly template into concrete 20-minute slots (FR-P3). */
export function slotsFromTemplate(p: Practitioner, fromMs: number, days = SLOT_HORIZON_DAYS): Array<Pick<Slot, 'id' | 'start'>> {
  const out: Array<Pick<Slot, 'id' | 'start'>> = [];
  const { ymd: startYmd } = zonedDay(fromMs, p.timezone);
  for (let i = 0; i <= days; i++) {
    const ymd = addDaysYmd(startYmd, i);
    const noon = zonedToUtc(ymd, '12:00', p.timezone);
    const { weekday } = zonedDay(noon, p.timezone);
    for (const w of p.availability.filter(a => a.weekday === weekday)) {
      for (let t = minutes(w.start); t + SLOT_MINUTES <= minutes(w.end); t += SLOT_STEP_MINUTES) {
        const start = zonedToUtc(ymd, hhmm(t), p.timezone);
        if (start <= fromMs) continue;
        out.push({ id: `${p.id}@${new Date(start).toISOString()}`, start: new Date(start).toISOString() });
      }
    }
  }
  return out;
}

export function refreshSlots(db: DemoDB, now: number) {
  const keep = db.slots.filter(s => s.status !== 'open' || (Date.parse(s.start) > now && Date.parse(s.start) < now + (SLOT_HORIZON_DAYS + 1) * DAY));
  const ids = new Set(keep.map(s => s.id));
  for (const p of db.practitioners) {
    const wanted = new Set<string>();
    for (const s of slotsFromTemplate(p, now)) {
      wanted.add(s.id);
      if (!ids.has(s.id)) {
        keep.push({ id: s.id, practitioner_id: p.id, start: s.start, minutes: SLOT_MINUTES, status: 'open' });
        ids.add(s.id);
      }
    }
    // Template edits remove open slots that no longer fit the template.
    for (let i = keep.length - 1; i >= 0; i--) {
      const s = keep[i];
      if (s.practitioner_id === p.id && s.status === 'open' && !wanted.has(s.id)) keep.splice(i, 1);
    }
  }
  db.slots = keep.sort((a, b) => a.start.localeCompare(b.start));
}

export function runScheduledJobs(db: DemoDB, now: number) {
  refreshSlots(db, now);
  runChatJobs(db, now);
}
