'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { formatAud, formatCount, formatShare } from '@/lib/market/format';
import { formatDayStable } from '@/lib/time';
import type { Breakdown, BreakdownBucketKey } from '@/lib/market/types';
import { Segmented } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type Range = '3m' | '6m' | '1y' | '2y';
const RANGE_WEEKS: Record<Range, number> = { '3m': 13, '6m': 26, '1y': 52, '2y': 104 };

// DESIGN §2.2: ordered ramp for Experience, categorical for rights / mode,
// "Not stated" always faint. Literal class names so Tailwind can see them.
const TONE: Record<BreakdownBucketKey, { fill: string; stroke: string; bg: string; text: string }> = {
  entry: { fill: 'fill-series-ord-1', stroke: 'stroke-series-ord-1', bg: 'bg-series-ord-1', text: 'text-series-ord-1' },
  mid: { fill: 'fill-series-ord-2', stroke: 'stroke-series-ord-2', bg: 'bg-series-ord-2', text: 'text-series-ord-2' },
  senior: { fill: 'fill-series-ord-3', stroke: 'stroke-series-ord-3', bg: 'bg-series-ord-3', text: 'text-series-ord-3' },
  expert: { fill: 'fill-series-ord-4', stroke: 'stroke-series-ord-4', bg: 'bg-series-ord-4', text: 'text-series-ord-4' },
  requires_pr: { fill: 'fill-series-cat-1', stroke: 'stroke-series-cat-1', bg: 'bg-series-cat-1', text: 'text-series-cat-1' },
  not_stated: { fill: 'fill-faint', stroke: 'stroke-faint', bg: 'bg-faint', text: 'text-faint' },
  sponsorship_ok: { fill: 'fill-series-cat-2', stroke: 'stroke-series-cat-2', bg: 'bg-series-cat-2', text: 'text-series-cat-2' },
  onsite: { fill: 'fill-series-cat-1', stroke: 'stroke-series-cat-1', bg: 'bg-series-cat-1', text: 'text-series-cat-1' },
  hybrid: { fill: 'fill-series-cat-2', stroke: 'stroke-series-cat-2', bg: 'bg-series-cat-2', text: 'text-series-cat-2' },
  remote: { fill: 'fill-series-cat-3', stroke: 'stroke-series-cat-3', bg: 'bg-series-cat-3', text: 'text-series-cat-3' },
};
/** Lines also differ by dash pattern so colour is never the only cue. */
const DASH = [undefined, '7 3', '2 3', '10 3 2 3'] as const;

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

/** Spread label y positions so none overlap (min gap in px), keeping order. */
function spread(ys: Array<{ key: BreakdownBucketKey; y: number }>, gap: number, lo: number, hi: number) {
  const sorted = [...ys].sort((a, b) => a.y - b.y);
  for (let i = 1; i < sorted.length; i++) sorted[i].y = Math.max(sorted[i].y, sorted[i - 1].y + gap);
  const over = (sorted[sorted.length - 1]?.y ?? 0) - hi;
  if (over > 0) for (const s of sorted) s.y -= over;
  for (const s of sorted) s.y = Math.max(lo, s.y);
  return sorted;
}

/**
 * Breakdown chart (GLOSSARY §2, DESIGN §6). Stack: bands sum to the total
 * line, y from 0, 1px surface stroke between bands. Lines: one per bucket,
 * gaps where the sample is too small. Direct labels at the right edge where
 * they fit, a legend with latest values below, and a data-table view.
 */
export function BreakdownChart({ breakdown, caption, height = 280, className }: { breakdown: Breakdown; caption: string; height?: number; className?: string }) {
  const t = useTranslations('Breakdown');
  const tc = useTranslations('Chart');
  const [range, setRange] = useState<Range>('1y');
  const [showTable, setShowTable] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [width, setWidth] = useState(720);
  const wrap = useRef<HTMLDivElement>(null);
  const stack = breakdown.kind === 'stack';
  const fmt = (v: number) => (stack ? formatCount(v) : formatAud(v));
  const hatchId = useId().replace(/:/g, '');
  // Stack: a band below the sample threshold is drawn hatched and never gets a number
  // (legend, end label, tooltip and table agree). Weeks below the threshold read "Not enough ads".
  const thin = new Set(stack ? breakdown.insufficient : []);
  const minSample = breakdown.buckets[0]?.latest.min_sample ?? 30;
  const cellText = (v: number | null) => (v == null ? '—' : stack && v < minSample ? t('notEnough') : fmt(v));
  const label = (k: BreakdownBucketKey) => t(`buckets.${k}`);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const weeks = RANGE_WEEKS[range];
  const buckets = useMemo(() => breakdown.buckets.map(b => ({ ...b, points: b.series.slice(-weeks) })), [breakdown.buckets, weeks]);
  const total = useMemo(() => breakdown.total?.slice(-weeks) ?? null, [breakdown.total, weeks]);
  const dates = (buckets[0]?.points ?? []).map(p => p.date);
  const n = dates.length;

  // Cumulative tops for the stack (bottom bucket first); null where any band is missing.
  const stacked = useMemo(() => {
    if (!stack) return null;
    return dates.map((_, i) => {
      let acc = 0;
      const tops: number[] = [];
      for (const b of buckets) {
        const v = b.points[i]?.value;
        if (v == null) return null;
        acc += v;
        tops.push(acc);
      }
      return tops;
    });
  }, [stack, buckets, dates]);

  const values = stack
    ? (stacked ?? []).flatMap(tops => (tops ? [tops[tops.length - 1] ?? 0] : [])).concat((total ?? []).flatMap(p => (p.value == null ? [] : [p.value])))
    : buckets.flatMap(b => b.points.flatMap(p => (p.value == null ? [] : [p.value])));
  const hasData = values.length > 1;
  const directLabels = width >= 520;
  const m = { l: 52, r: directLabels ? 104 : 10, t: 12, b: 28 };
  const innerW = width - m.l - m.r;
  const innerH = height - m.t - m.b;
  const lo = hasData ? Math.min(...values) : 0;
  const hi = hasData ? Math.max(...values) : 1;
  const pad = (hi - lo) * 0.12 || hi * 0.1 || 1;
  // DESIGN §6.2: counts and areas start at 0; salary lines may not.
  const ticks = niceTicks(stack ? 0 : Math.max(0, lo - pad), hi + pad);
  const yMin = stack ? 0 : ticks[0];
  const yMax = ticks[ticks.length - 1];
  const x = (i: number) => m.l + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v: number) => m.t + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;

  const bands = (() => {
    if (!stacked) return [];
    const idx = stacked.map((tops, i) => (tops ? i : -1)).filter(i => i >= 0);
    return buckets.map((b, k) => {
      if (!idx.length) return { key: b.key, d: '' };
      const top = idx.map(i => `${x(i).toFixed(1)} ${y(stacked[i]?.[k] ?? 0).toFixed(1)}`);
      const bottom = idx.slice().reverse().map(i => `${x(i).toFixed(1)} ${y(k === 0 ? 0 : stacked[i]?.[k - 1] ?? 0).toFixed(1)}`);
      return { key: b.key, d: `M${top.join(' L')} L${bottom.join(' L')} Z` };
    });
  })();

  const linePath = (points: Array<{ value: number | null }>) => {
    let d = '';
    let pen = false;
    points.forEach((p, i) => {
      if (p.value == null) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`;
      pen = true;
    });
    return d;
  };

  // Direct labels at the right edge: band middles (if the band is tall enough) or line ends.
  const endLabels = (() => {
    if (!directLabels || !hasData || !n) return [];
    const last = n - 1;
    if (stack) {
      const tops = stacked?.[last];
      if (!tops) return [];
      const raw = buckets.map((b, k) => {
        const y0 = y(k === 0 ? 0 : tops[k - 1] ?? 0);
        const y1 = y(tops[k] ?? 0);
        return { key: b.key, y: (y0 + y1) / 2, h: y0 - y1 };
      }).filter(l => l.h >= 13 && !thin.has(l.key));
      return spread(raw.map(({ key, y: yy }) => ({ key, y: yy })), 13, m.t + 6, m.t + innerH);
    }
    const raw = buckets.flatMap(b => {
      const lastIdx = [...b.points.keys()].reverse().find(i => b.points[i]?.value != null);
      const v = lastIdx === undefined ? null : b.points[lastIdx]?.value;
      return v == null ? [] : [{ key: b.key, y: y(v) }];
    });
    return spread(raw, 13, m.t + 6, m.t + innerH);
  })();

  const monthTicks = useMemo(() => {
    const out: Array<{ i: number; label: string }> = [];
    let lastMonth = '';
    dates.forEach((d, i) => {
      const month = d.slice(0, 7);
      if (month !== lastMonth) {
        lastMonth = month;
        if (i > 0) out.push({ i, label: formatDayStable(d, { day: false, year: d.slice(5, 7) === '01' ? 'short' : false }) });
      }
    });
    const every = Math.ceil(out.length / Math.max(2, Math.floor(innerW / 70)));
    return out.filter((_, k) => k % every === 0);
  }, [dates, innerW]);

  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const i = Math.round(((px - m.l) / innerW) * (n - 1));
    setCursor(Math.min(n - 1, Math.max(0, i)));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (!n) return;
    const cur = cursor ?? n - 1;
    const map: Record<string, number> = { ArrowLeft: cur - 1, ArrowRight: cur + 1, Home: 0, End: n - 1 };
    if (e.key in map) {
      e.preventDefault();
      setCursor(Math.min(n - 1, Math.max(0, map[e.key])));
    } else if (e.key === 'Escape') setCursor(null);
  };
  const valueAt = (k: number, i: number) => buckets[k]?.points[i]?.value ?? null;
  const readout = cursor !== null && dates[cursor]
    ? `${formatDayStable(dates[cursor])}: ${buckets.map((b, k) => `${label(b.key)} ${cellText(valueAt(k, cursor))}`).join(', ')}`
    : '';
  const tipLeft = cursor !== null ? Math.min(width - 210, Math.max(0, x(cursor) - 100)) : 0;
  const ariaBuckets = breakdown.buckets.map(b => `${label(b.key)} ${b.latest.value == null ? t('notEnough') : fmt(b.latest.value)}`).join(', ');

  return (
    <figure className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="kicker">{caption}</figcaption>
        <Segmented size="sm" label={tc('rangeLabel')} value={range} onValueChange={setRange} options={(Object.keys(RANGE_WEEKS) as Range[]).map(r => ({ value: r, label: tc(`range.${r}`) }))} />
      </div>
      <div ref={wrap} className="relative w-full select-none">
        {hasData ? (
          <svg
            role="img"
            aria-label={t('chartLabel', { caption, buckets: ariaBuckets })}
            tabIndex={0}
            viewBox={`0 0 ${width} ${height}`}
            width={width}
            height={height}
            className="block max-w-full touch-pan-y rounded-[3px] focus-visible:outline-offset-4"
            onPointerMove={onMove}
            onPointerLeave={() => setCursor(null)}
            onKeyDown={onKey}
            onFocus={() => setCursor(c => c ?? n - 1)}
            onBlur={() => setCursor(null)}
          >
            {ticks.map(v => (
              <g key={v}>
                <line x1={m.l} x2={m.l + innerW} y1={y(v)} y2={y(v)} className="stroke-rule" strokeDasharray={v === yMin ? undefined : '2 3'} />
                <text x={m.l - 8} y={y(v)} dy="0.32em" textAnchor="end" className="fill-muted font-mono text-[10.5px]">{fmt(v)}</text>
              </g>
            ))}
            {monthTicks.map(tk => (
              <text key={tk.i} x={x(tk.i)} y={height - 8} textAnchor="middle" className="fill-muted font-mono text-[10.5px]">{tk.label}</text>
            ))}
            {stack ? (
              <>
                <defs>
                  {[...thin].map(key => (
                    <pattern key={key} id={`${hatchId}-${key}`} width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                      <rect width="6" height="6" className="fill-surface" />
                      <line x1="0" y1="0" x2="0" y2="6" className={TONE[key].stroke} strokeWidth={2.5} />
                    </pattern>
                  ))}
                </defs>
                {bands.map(b => (
                  <path
                    key={b.key}
                    d={b.d}
                    fill={thin.has(b.key) ? `url(#${hatchId}-${b.key})` : undefined}
                    className={cn(!thin.has(b.key) && TONE[b.key].fill, 'stroke-surface')}
                    strokeWidth={1}
                    strokeLinejoin="round"
                  />
                ))}
                {total ? <path d={linePath(total)} fill="none" className="stroke-ink" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" /> : null}
              </>
            ) : (
              buckets.map((b, k) => (
                <path key={b.key} d={linePath(b.points)} fill="none" className={TONE[b.key].stroke} strokeWidth={2} strokeDasharray={DASH[k % DASH.length]} strokeLinejoin="round" strokeLinecap="round" />
              ))
            )}
            {endLabels.map(l => (
              <g key={l.key} aria-hidden>
                <line x1={m.l + innerW + 4} x2={m.l + innerW + 12} y1={l.y} y2={l.y} className={TONE[l.key].stroke} strokeWidth={3} />
                <text x={m.l + innerW + 16} y={l.y} dy="0.32em" className="fill-ink-2 text-[11.5px]">{t(`short.${l.key}`)}</text>
              </g>
            ))}
            {cursor !== null ? (
              <g aria-hidden>
                <line x1={x(cursor)} x2={x(cursor)} y1={m.t} y2={m.t + innerH} className="stroke-ink/40" />
                {stack
                  ? stacked?.[cursor]?.map((top, k) => <circle key={buckets[k].key} cx={x(cursor)} cy={y(top)} r={3} className={cn('stroke-surface', TONE[buckets[k].key].fill)} strokeWidth={1.5} />)
                  : buckets.map((b, k) => {
                    const v = valueAt(k, cursor);
                    return v == null ? null : <circle key={b.key} cx={x(cursor)} cy={y(v)} r={3.5} className={cn('stroke-surface', TONE[b.key].fill)} strokeWidth={2} />;
                  })}
              </g>
            ) : null}
          </svg>
        ) : (
          <p className="grid place-items-center rounded-md border border-dashed border-rule text-sm text-muted" style={{ height }}>{tc('noData')}</p>
        )}
        {cursor !== null && dates[cursor] ? (
          <div aria-hidden className="pointer-events-none absolute top-0 w-[200px] rounded-[4px] bg-ink px-2.5 py-2 text-[12px] text-paper shadow-float" style={{ left: tipLeft }}>
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-paper/70">{formatDayStable(dates[cursor])}</p>
            {[...buckets].map((b, k) => ({ b, k })).reverse().map(({ b, k }) => {
              const v = valueAt(k, cursor);
              return (
                <p key={b.key} className="num mt-0.5 flex justify-between gap-3">
                  <span className="truncate text-paper/80">{t(`short.${b.key}`)}</span>
                  <span className="font-medium">{cellText(v)}</span>
                </p>
              );
            })}
            {stack && total?.[cursor]?.value != null ? (
              <p className="num mt-1 flex justify-between gap-3 border-t border-paper/20 pt-1">
                <span className="text-paper/80">{t('total')}</span>
                <span className="font-medium">{fmt(total[cursor].value as number)}</span>
              </p>
            ) : null}
          </div>
        ) : null}
        <p className="sr-only" aria-live="polite">{readout}</p>
      </div>

      <div>
        <p className="kicker mb-2">{stack ? t('legendStack') : t('legendLines')}</p>
        <ul aria-label={t('legendLabel')} className="flex max-w-md flex-col gap-1.5">
          {[...breakdown.buckets].reverse().map(b => {
            const k = breakdown.buckets.indexOf(b);
            return (
              <li key={b.key} className="flex min-w-0 items-center gap-2.5 text-[13px]">
                {stack
                  ? <span aria-hidden className={cn('size-3 shrink-0 rounded-[2px]', thin.has(b.key) ? cn('border border-current bg-[repeating-linear-gradient(45deg,currentColor_0_2px,transparent_2px_5px)]', TONE[b.key].text) : TONE[b.key].bg)} />
                  : <svg aria-hidden width="20" height="8" className="shrink-0"><line x1="1" x2="19" y1="4" y2="4" className={TONE[b.key].stroke} strokeWidth={2.5} strokeDasharray={DASH[k % DASH.length]} strokeLinecap="round" /></svg>}
                <span className="min-w-0 flex-1 truncate text-ink-2">{label(b.key)}</span>
                <span className="num whitespace-nowrap text-ink">
                  {b.latest.value == null
                    ? <span className="text-muted">{t('notEnough')}</span>
                    : stack
                      ? <>{formatCount(b.latest.value)}<span className="text-muted">{' · '}{b.share == null ? '—' : formatShare(b.share)}</span></>
                      : formatAud(b.latest.value)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <Button variant="link" size="sm" onClick={() => setShowTable(s => !s)} aria-expanded={showTable}>
          {showTable ? tc('hideTable') : tc('showTable')}
        </Button>
        {showTable ? (
          <div tabIndex={0} role="region" aria-label={caption} className="mt-2 max-h-72 overflow-auto rounded-md border border-rule focus-visible:outline-offset-2">
            <table className="w-full text-[13px]">
              <caption className="sr-only">{caption}</caption>
              <thead className="sticky top-0 bg-sunken">
                <tr>
                  <th scope="col" className="kicker px-3 py-2 text-left">{tc('week')}</th>
                  {buckets.map(b => <th key={b.key} scope="col" className="kicker px-3 py-2 text-right">{t(`short.${b.key}`)}</th>)}
                  {stack ? <th scope="col" className="kicker px-3 py-2 text-right">{t('total')}</th> : null}
                </tr>
              </thead>
              <tbody className="num">
                {dates.map((d, i) => ({ d, i })).reverse().map(({ d, i }) => (
                  <tr key={d} className="border-t border-rule">
                    <th scope="row" className="whitespace-nowrap px-3 py-1.5 text-left font-normal text-ink-2">{formatDayStable(d)}</th>
                    {buckets.map((b, k) => <td key={b.key} className="px-3 py-1.5 text-right">{cellText(valueAt(k, i))}</td>)}
                    {stack ? <td className="px-3 py-1.5 text-right font-medium">{total?.[i]?.value == null ? '—' : fmt(total[i].value as number)}</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </figure>
  );
}
