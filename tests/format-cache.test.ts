import { describe, expect, it } from 'vitest';
import { formatAud, formatCount } from '@/lib/market/format';
import { formatDateTime, formatTime } from '@/lib/time';

// The formatters are built once and reused; output must match a freshly built formatter.

describe('cached number formatters', () => {
  const counts = [0, 0.4, 0.5, 1, 7, 999, 1000, 1234.5, 98_765, 1_234_567, -42, -1500.6];

  it.each(counts)('formatCount(%s) matches a fresh en-AU formatter', n => {
    expect(formatCount(n)).toBe(new Intl.NumberFormat('en-AU').format(Math.round(n)));
  });

  it('keeps the established count output', () => {
    expect(formatCount(1234.5)).toBe('1,235');
    expect(formatCount(1_234_567)).toBe('1,234,567');
    expect(formatCount(0)).toBe('0');
  });

  it.each([0, 999, 72_500, 95_499.5, 120_000, 1_250_000])('formatAud(%s, false) matches a fresh AUD formatter', n => {
    expect(formatAud(n, false)).toBe(new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 }).format(n));
  });

  it('keeps the established currency output', () => {
    expect(formatAud(120_000, false)).toBe('$120,000');
    expect(formatAud(120_000)).toBe('$120k');
  });
});

describe('cached time formatters', () => {
  const iso = '2026-10-28T03:45:00.000Z';

  it.each(['Australia/Sydney', 'Australia/Perth', 'UTC'])('matches fresh formatters in %s, repeatedly', tz => {
    const dateTime = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: tz, timeZoneName: 'short' }).format(new Date(iso));
    const time = new Intl.DateTimeFormat('en-AU', { hour: 'numeric', minute: '2-digit', timeZone: tz }).format(new Date(iso));
    for (let i = 0; i < 2; i++) {
      expect(formatDateTime(iso, tz)).toBe(dateTime);
      expect(formatTime(iso, tz)).toBe(time);
    }
  });

  it('uses the default zone and still rejects an invalid one', () => {
    expect(formatTime(iso)).toBe(formatTime(iso, 'Australia/Sydney'));
    expect(() => formatTime(iso, 'Not/AZone')).toThrow(RangeError);
    expect(() => formatTime(iso, 'Not/AZone')).toThrow(RangeError);
  });
});
