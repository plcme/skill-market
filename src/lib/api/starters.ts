import { getInstrument } from '@/lib/market/catalog';
import type { Signal } from '@/lib/market/types';
import type { Topic } from '@/lib/demo/seed';
import { topicsForQuestion } from './matching';
import type { Practitioner } from './types';

// Conversation starters (FR-C4, ARCHITECTURE §7.1 step 5). Deterministic
// template picks — no LLM. The copy for each template lives in messages under
// `Starters.<id>`; this module decides which three to use and fills the slots.

export const STARTER_TEMPLATES = [
  'signal_rise', 'signal_fall', 'signal_entry', 'signal_since', 'no_signal', 'role_path', 'adjacent',
  'choosing_electives', 'grad_programs', 'internships', 'first_90_days', 'side_projects', 'portfolio',
  'interview_prep', 'visa_work_rights', 'switching_into_tech', 'day_to_day', 'decision',
] as const;
export type StarterTemplate = (typeof STARTER_TEMPLATES)[number];

export interface StarterPick {
  id: StarterTemplate;
  vars: Record<string, string | number>;
}

export interface StarterContext {
  instrument_slug: string;
  signal: Pick<Signal, 'kind' | 'from' | 'to'> | null;
  decision_question: string;
  practitioner: Pick<Practitioner, 'topics' | 'skills'>;
  /** Related skill the practitioner was matched through, if any. */
  adjacent_skill?: string | null;
}

export const STARTER_COUNT = 3;
const FALLBACKS: readonly StarterTemplate[] = ['day_to_day', 'side_projects', 'first_90_days', 'portfolio'];
const QUESTION_SNIPPET = 90;

function snippet(q: string): string {
  const clean = q.trim().replace(/\s+/g, ' ').replace(/[.?!]+$/, '');
  if (clean.length <= QUESTION_SNIPPET) return clean;
  const cut = clean.slice(0, QUESTION_SNIPPET);
  return `${cut.slice(0, cut.lastIndexOf(' ') > 40 ? cut.lastIndexOf(' ') : QUESTION_SNIPPET)}…`;
}

function isTemplate(id: string): id is StarterTemplate {
  return (STARTER_TEMPLATES as readonly string[]).includes(id);
}

/** Pick exactly three starters: one from the signal, one from the decision, one from the practitioner. */
export function generateStarters(ctx: StarterContext): StarterPick[] {
  const inst = getInstrument(ctx.instrument_slug);
  const name = inst?.name ?? ctx.instrument_slug;
  const base = { instrument: name };
  const picks: StarterPick[] = [];
  const used = new Set<StarterTemplate>();
  const add = (id: StarterTemplate, vars: Record<string, string | number> = base) => {
    if (used.has(id) || picks.length >= STARTER_COUNT) return;
    used.add(id);
    picks.push({ id, vars });
  };

  // 1. Why now — the signal (or the adjacent skill) that started this.
  if (ctx.adjacent_skill) {
    add('adjacent', { ...base, adjacent: getInstrument(ctx.adjacent_skill)?.name ?? ctx.adjacent_skill });
  } else if (ctx.signal) {
    const vars = { ...base, from: Math.round(ctx.signal.from), to: Math.round(ctx.signal.to) };
    if (ctx.signal.kind === 'rise') add('signal_rise', vars);
    else if (ctx.signal.kind === 'fall') add('signal_fall', vars);
    else if (ctx.signal.kind === 'entry_open') add('signal_entry', base);
    else add('signal_since', base);
  } else {
    add(inst?.type === 'role' ? 'role_path' : 'no_signal');
  }

  // 2. The decision — a topic the question touches, preferring one the practitioner offers.
  const asked = topicsForQuestion(ctx.decision_question);
  const topic: Topic | undefined = asked.find(t => ctx.practitioner.topics.includes(t)) ?? asked[0];
  if (topic) add(topic);
  else if (ctx.decision_question.trim()) add('decision', { ...base, question: snippet(ctx.decision_question) });

  // 3. The person — something they said they are happy to talk about.
  for (const t of ctx.practitioner.topics) {
    if (picks.length >= STARTER_COUNT) break;
    if (isTemplate(t)) add(t);
  }
  for (const f of FALLBACKS) add(f);
  return picks;
}
