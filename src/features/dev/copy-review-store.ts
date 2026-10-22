// Temporary copy-review mode (FE-R5). Lets the user mark which explanatory
// texts to delete, move into the ⓘ popover, or keep, and export the decisions
// as JSON. Dev builds only; the whole `src/features/dev` folder is meant to be
// removed in one commit once the review is done.

export type Proposal = 'delete' | 'info';
export type Decision = 'delete' | 'info' | 'keep';

export interface ReviewEntry {
  decision: Decision | null;
  note: string;
  text: string;
  page: string;
}

export type ReviewDecisions = Record<string, ReviewEntry>;

export const STORAGE_KEY = 'copy-review-v1';
export const SESSION_KEY = 'copy-review-active';
export const QUERY_PARAM = 'review';
export const QUERY_VALUE = 'copy';

/** Never in production output: `NODE_ENV` is inlined at build time, so prod bundles drop the mode. */
export const COPY_REVIEW_ENABLED = process.env.NODE_ENV !== 'production';

/** `?review=copy` turns the mode on, `?review=off` turns it off, anything else keeps the session's state. */
export function activationFromSearch(search: string, stored: boolean): boolean {
  const value = new URLSearchParams(search).get(QUERY_PARAM);
  if (value === QUERY_VALUE) return true;
  if (value === 'off') return false;
  return stored;
}

export function parseDecisions(raw: string | null): ReviewDecisions {
  if (!raw) return {};
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const out: ReviewDecisions = {};
    for (const [id, entry] of Object.entries(value as Record<string, unknown>)) {
      if (!entry || typeof entry !== 'object') continue;
      const e = entry as Partial<ReviewEntry>;
      const decision = e.decision === 'delete' || e.decision === 'info' || e.decision === 'keep' ? e.decision : null;
      out[id] = { decision, note: typeof e.note === 'string' ? e.note : '', text: typeof e.text === 'string' ? e.text : '', page: typeof e.page === 'string' ? e.page : '' };
    }
    return out;
  } catch {
    return {};
  }
}

/** Sets or updates one entry; an entry with no decision and no note is removed. */
export function withDecision(all: ReviewDecisions, id: string, patch: Partial<ReviewEntry>): ReviewDecisions {
  const prev = all[id] ?? { decision: null, note: '', text: '', page: '' };
  const next = { ...prev, ...patch };
  const out = { ...all };
  if (next.decision === null && !next.note.trim()) delete out[id];
  else out[id] = next;
  return out;
}

/** How many of the ids on screen have a decision. */
export function reviewedCount(ids: Iterable<string>, all: ReviewDecisions): { done: number; total: number } {
  const list = [...new Set(ids)];
  return { done: list.filter(id => all[id]?.decision).length, total: list.length };
}

/* ------------------------------------------------------------------ store */

type Listener = () => void;
const listeners = new Set<Listener>();
let active = false;
let decisions: ReviewDecisions = {};
let initialised = false;
const mounted = new Map<string, number>();
let mountedSnapshot: string[] = [];

function emit() {
  for (const l of listeners) l();
}

function init() {
  if (initialised || typeof window === 'undefined') return;
  initialised = true;
  refreshActivation();
  try {
    decisions = parseDecisions(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    decisions = {};
  }
}

export function refreshActivation() {
  if (!COPY_REVIEW_ENABLED || typeof window === 'undefined') return;
  let stored = false;
  try {
    stored = window.sessionStorage.getItem(SESSION_KEY) === '1';
  } catch { /* storage blocked */ }
  const next = activationFromSearch(window.location.search, stored);
  try {
    if (next) window.sessionStorage.setItem(SESSION_KEY, '1');
    else window.sessionStorage.removeItem(SESSION_KEY);
  } catch { /* storage blocked */ }
  if (next !== active) {
    active = next;
    emit();
  }
}

export function subscribe(l: Listener) {
  init();
  listeners.add(l);
  return () => { listeners.delete(l); };
}

export function getActive() {
  init();
  return active;
}

export function getDecisions() {
  init();
  return decisions;
}

export function getMounted() {
  return mountedSnapshot;
}

export function setDecision(id: string, patch: Partial<ReviewEntry>) {
  decisions = withDecision(decisions, id, patch);
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(decisions));
  } catch { /* storage blocked */ }
  emit();
}

export function clearDecisions() {
  decisions = {};
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch { /* storage blocked */ }
  emit();
}

export function registerText(id: string) {
  mounted.set(id, (mounted.get(id) ?? 0) + 1);
  mountedSnapshot = [...mounted.keys()];
  emit();
  return () => {
    const n = (mounted.get(id) ?? 1) - 1;
    if (n <= 0) mounted.delete(id);
    else mounted.set(id, n);
    mountedSnapshot = [...mounted.keys()];
    emit();
  };
}
