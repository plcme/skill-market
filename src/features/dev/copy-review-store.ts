// Temporary copy-review mode (FE-R5, revived in FE-R9 for onboarding and sign-in).
// Lets the user mark which explanatory texts to keep, move into the ⓘ popover
// or delete, and export the decisions as JSON. Dev builds only; the whole
// `src/features/dev` folder is meant to be removed in one commit once the
// review is done.

export type Decision = 'delete' | 'info' | 'keep';

export interface ReviewEntry {
  decision: Decision | null;
  note: string;
  text: string;
  page: string;
}

export type ReviewDecisions = Record<string, ReviewEntry>;

/** v2 = FE-R9; FE-R5 decisions (v1) are ignored on purpose. */
export const STORAGE_KEY = 'copy-review-v2';
export const SESSION_KEY = 'copy-review-v2-active';
export const QUERY_PARAM = 'review';
export const QUERY_VALUE = 'copy';

/** Never in production output: `NODE_ENV` is inlined at build time, so prod bundles drop the mode. */
export const COPY_REVIEW_ENABLED = process.env.NODE_ENV !== 'production';

/* ---------------------------------------------------------------- catalogue */

export interface ReviewItem {
  id: string;
  /** Page or step the text belongs to; the panel groups by it. */
  group: string;
  /** Message key (`Namespace.path`) used as the text until the item has been on screen. */
  source: string;
}

const item = (group: string) => (id: string, source: string): ReviewItem => ({ id, group, source });
const basics = item('Onboarding · Basics');
const start = item('Onboarding · Starting point');
const units = item('Onboarding · Units');
const done = item('Onboarding · Your board');
const board = item('Onboarding · Mini-board (starting point and board)');
const login = item('Sign in');
const callback = item('Sign-in link');
const signout = item('Signed out');

/** This round's candidates (FE-R9): every explanatory text on the onboarding and sign-in pages. */
export const REVIEW_ITEMS: readonly ReviewItem[] = [
  basics('onboarding.basics.lede', 'Onboarding.basicsLede'),
  basics('onboarding.basics.universityHint', 'Onboarding.universityHint'),
  basics('onboarding.basics.degreeHint', 'Onboarding.degreeHint'),
  basics('onboarding.basics.yearHint', 'Onboarding.yearHint'),
  basics('onboarding.basics.privacyNote', 'Onboarding.privacyNote'),

  start('onboarding.start.lede', 'Onboarding.context'),
  start('onboarding.start.nextUnitsTitle', 'Onboarding.nextUnitsTitle'),
  start('onboarding.start.nextUnitsBody', 'Onboarding.nextUnitsBody'),

  board('onboarding.board.firstBody', 'Onboarding.board.firstBody'),
  board('onboarding.board.suggestionBadge', 'StudentShared.suggestion'),
  board('onboarding.board.suggestionConfidence', 'StudentShared.confidence'),
  board('onboarding.board.suggestionReason', 'StudentShared.fromDegree'),
  board('onboarding.board.suggestionNote', 'Onboarding.board.suggestionNote'),
  board('onboarding.board.rolesVia', 'Onboarding.board.rolesVia'),
  board('onboarding.board.nextBecause', 'Onboarding.board.nextBecause'),
  board('onboarding.board.nextFirst', 'Onboarding.board.nextFirst'),
  board('onboarding.board.nextEffort', 'StudentShared.effort.months'),

  units('onboarding.units.lede', 'Onboarding.unitsLede'),
  units('onboarding.units.unitsFrom', 'Onboarding.unitsFrom'),
  units('onboarding.units.unitTeaches', 'Onboarding.unitTeaches'),
  units('onboarding.units.noUnitMatch', 'Onboarding.noUnitMatch'),
  units('onboarding.units.unitsAdd', 'Onboarding.unitsAdd'),
  units('onboarding.units.unitsNone', 'Onboarding.unitsNone'),
  units('onboarding.units.noUnitsBody', 'Onboarding.noUnitsBody'),

  done('onboarding.done.lede', 'Onboarding.context'),
  done('onboarding.done.emptyLede', 'Onboarding.doneEmptyLede'),
  done('onboarding.done.saveBody', 'Onboarding.saveBody'),

  login('auth.login.lede', 'Auth.lede'),
  login('auth.login.benefit1', 'Auth.benefits.b1'),
  login('auth.login.benefit2', 'Auth.benefits.b2'),
  login('auth.login.benefit3', 'Auth.benefits.b3'),
  login('auth.login.free', 'Auth.free'),
  login('auth.login.emailHint', 'Auth.emailHint'),
  login('auth.login.ageHint', 'Auth.ageHint'),
  login('auth.login.privacyHint', 'Auth.privacyHint'),
  login('auth.login.googleNote', 'Auth.googleNote'),
  login('auth.login.alreadyBody', 'Auth.alreadyBody'),
  login('auth.login.sentBody', 'Auth.sentBody'),
  login('auth.login.sentHint', 'Auth.sentHint'),
  login('auth.login.previewBody', 'Auth.previewBody'),

  callback('auth.callback.error', 'StudentErrors.linkExpired'),

  signout('auth.signout.signedOutBody', 'Auth.signedOutBody'),
  signout('auth.signout.deletedBody', 'Auth.deletedBody'),
];

export const REVIEW_ITEM_IDS: ReadonlySet<string> = new Set(REVIEW_ITEMS.map(i => i.id));

/** Catalogue items in order, grouped by page or step. */
export function groupItems(items: readonly ReviewItem[]): Array<{ group: string; items: ReviewItem[] }> {
  const out: Array<{ group: string; items: ReviewItem[] }> = [];
  for (const it of items) {
    const g = out.find(x => x.group === it.group);
    if (g) g.items.push(it);
    else out.push({ group: it.group, items: [it] });
  }
  return out;
}

/** Looks up `Namespace.path` in the loaded messages; the raw template, or null. */
export function messageAt(messages: unknown, source: string): string | null {
  const value = source.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), messages);
  return typeof value === 'string' ? value : null;
}

/** Decisions plus the group of each item, ready to paste back into a chat. */
export function exportDecisions(all: ReviewDecisions): Record<string, ReviewEntry & { group: string }> {
  const groupOf = new Map(REVIEW_ITEMS.map(i => [i.id, i.group]));
  const order = new Map(REVIEW_ITEMS.map((i, n) => [i.id, n]));
  const ids = Object.keys(all).sort((a, b) => (order.get(a) ?? Infinity) - (order.get(b) ?? Infinity));
  return Object.fromEntries(ids.map(id => [id, { ...all[id], group: groupOf.get(id) ?? '' }]));
}

/* ------------------------------------------------------------- pure helpers */

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

/** How many of the given ids have a decision. */
export function reviewedCount(ids: Iterable<string>, all: ReviewDecisions): { done: number; total: number } {
  const list = [...new Set(ids)];
  return { done: list.filter(id => all[id]?.decision).length, total: list.length };
}

/* -------------------------------------------------------------------- store */

type Listener = () => void;
const listeners = new Set<Listener>();
let active = false;
let decisions: ReviewDecisions = {};
let initialised = false;
const mounted = new Map<string, number>();
let mountedSnapshot: string[] = [];
/** Rendered text of each item seen this session (templates have placeholders; this doesn't). */
let seen: Record<string, string> = {};

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

export function getSeen() {
  return seen;
}

export function recordText(id: string, text: string) {
  if (!text || seen[id] === text) return;
  seen = { ...seen, [id]: text };
  emit();
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
