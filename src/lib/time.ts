// Time helpers shared by the store, jobs and UI. All instants are ISO strings in UTC;
// display happens in the viewer's or practitioner's time zone via Intl.

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;
export const DEFAULT_TZ = 'Australia/Sydney';

/** Offset (ms) of `tz` from UTC at the given instant. */
export function tzOffsetMs(instant: number, tz: string): number {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date(instant));
  const get = (t: string) => Number(parts.find(p => p.type === t)?.value ?? 0);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** Wall-clock date + "HH:MM" in `tz` → UTC epoch ms. */
export function zonedToUtc(ymd: string, hhmm: string, tz: string): number {
  const [y, m, d] = ymd.split('-').map(Number);
  const [hh, mm] = hhmm.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - tzOffsetMs(guess, tz);
  return guess - tzOffsetMs(first, tz);
}

/** Calendar date (YYYY-MM-DD) and ISO weekday (1 = Mon) of an instant in `tz`. */
export function zonedDay(instant: number, tz: string): { ymd: string; weekday: number } {
  const local = new Date(instant + tzOffsetMs(instant, tz));
  const wd = local.getUTCDay();
  return { ymd: local.toISOString().slice(0, 10), weekday: wd === 0 ? 7 : wd };
}

export function addDaysYmd(ymd: string, days: number): string {
  const t = Date.parse(`${ymd}T00:00:00Z`) + days * DAY;
  return new Date(t).toISOString().slice(0, 10);
}

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }, tz: string = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat('en-AU', { ...opts, timeZone: tz }).format(new Date(iso));
}

// Formatters with fixed options, cached per time zone. An invalid zone throws in the
// constructor and is never cached; the size cap guards against case variants of valid ones.
const dateTimeFormats = new Map<string, Intl.DateTimeFormat>();
const timeFormats = new Map<string, Intl.DateTimeFormat>();

function cachedFormat(cache: Map<string, Intl.DateTimeFormat>, tz: string, make: () => Intl.DateTimeFormat): Intl.DateTimeFormat {
  let format = cache.get(tz);
  if (!format) {
    format = make();
    if (cache.size >= 64) cache.delete(cache.keys().next().value!);
    cache.set(tz, format);
  }
  return format;
}

export function formatDateTime(iso: string, tz: string = DEFAULT_TZ): string {
  return cachedFormat(dateTimeFormats, tz, () => new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' })).format(new Date(iso));
}

export function formatTime(iso: string, tz: string = DEFAULT_TZ): string {
  return cachedFormat(timeFormats, tz, () => new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: tz })).format(new Date(iso));
}

/** "in 3 hours", "2 days ago" relative to `now`. */
export function formatRelative(iso: string, now: number): string {
  const diff = Date.parse(iso) - now;
  const abs = Math.abs(diff);
  const rtf = new Intl.RelativeTimeFormat('en-AU', { numeric: 'auto' });
  if (abs < HOUR) return rtf.format(Math.round(diff / 60_000), 'minute');
  if (abs < DAY) return rtf.format(Math.round(diff / HOUR), 'hour');
  if (abs < 30 * DAY) return rtf.format(Math.round(diff / DAY), 'day');
  return rtf.format(Math.round(diff / (30 * DAY)), 'month');
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * ICU data differs between Node and browsers ("Sep" vs "Sept"), which breaks
 * hydration. Use this for any date rendered by a client component on the server.
 * Input is a calendar date (YYYY-MM-DD or ISO); output "21 Sep 2026".
 */
export function formatDayStable(iso: string, parts: { day?: boolean; year?: boolean | 'short' } = { day: true, year: true }): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  const out: string[] = [];
  if (parts.day) out.push(String(d));
  out.push(MONTHS[m - 1]);
  if (parts.year) out.push(parts.year === 'short' ? `’${String(y).slice(2)}` : String(y));
  return out.join(' ');
}
