'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { METRICS } from '@/lib/metrics/registry';
import { formatCount, formatShare } from '@/lib/market/format';
import { formatDayStable } from '@/lib/time';
import type { MetricKey, SeriesPoint } from '@/lib/market/types';
import { Segmented } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface ChartLine {
  id: string;
  label: string;
  points: SeriesPoint[];
  tone: 'ink' | 'accent';
}

type Range = '3m' | '6m' | '1y' | '2y';
const RANGE_WEEKS: Record<Range, number> = { '3m': 13, '6m': 26, '1y': 52, '2y': 104 };

function niceTicks(min: number, max: number, count = 4): number[] {
  const span = max - min || Math.abs(max) || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; ticks.length < 2 || ticks[ticks.length - 1] < max; v += step) ticks.push(Number(v.toFixed(10)));
  return ticks;
}

/** Interactive weekly trend with hover/keyboard cursor and a data-table view (NFR-3). */
export function TrendChart({ lines, metric, caption, defaultRange = '1y', height = 260, className }: {
  lines: ChartLine[];
  metric: MetricKey;
  caption: string;
  defaultRange?: Range;
  height?: number;
  className?: string;
}) {
  const t = useTranslations('Chart');
  const tm = useTranslations('Metrics');
  const [range, setRange] = useState<Range>(defaultRange);
  const [showTable, setShowTable] = useState(false);
  const [cursor, setCursor] = useState<number | null>(null);
  const [width, setWidth] = useState(720);
  const wrap = useRef<HTMLDivElement>(null);
  const gradId = useId().replace(/:/g, '');
  const isShare = METRICS[metric].unit === 'share';
  const fmt = (v: number) => (isShare ? formatShare(v) : formatCount(v));

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.max(280, entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const weeks = RANGE_WEEKS[range];
  const visible = useMemo(() => lines.map(l => ({ ...l, points: l.points.slice(-weeks) })), [lines, weeks]);
  const n = visible[0]?.points.length ?? 0;
  const values = visible.flatMap(l => l.points.map(p => p.value)).filter((v): v is number => v !== null);
  const hasData = values.length > 1;

  const m = { l: 4, r: 58, t: 14, b: 28 };
  const innerW = width - m.l - m.r;
  const innerH = height - m.t - m.b;
  const lo = hasData ? Math.min(...values) : 0;
  const hi = hasData ? Math.max(...values) : 1;
  const pad = (hi - lo) * 0.12 || hi * 0.1 || 1;
  const ticks = niceTicks(Math.max(0, lo - pad), hi + pad);
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const x = (i: number) => m.l + (n <= 1 ? 0 : (i / (n - 1)) * innerW);
  const y = (v: number) => m.t + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;

  const paths = visible.map(l => {
    let d = '';
    let pen = false;
    l.points.forEach((p, i) => {
      if (p.value === null) { pen = false; return; }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.value).toFixed(1)}`;
      pen = true;
    });
    return d;
  });
  const first = visible[0];
  const firstIdx = first ? first.points.findIndex(p => p.value !== null) : -1;
  const area = first && firstIdx >= 0 ? `${paths[0]} L${x(n - 1).toFixed(1)} ${(m.t + innerH).toFixed(1)} L${x(firstIdx).toFixed(1)} ${(m.t + innerH).toFixed(1)} Z` : '';

  const monthTicks = useMemo(() => {
    if (!first) return [] as Array<{ i: number; label: string }>;
    const out: Array<{ i: number; label: string }> = [];
    let lastMonth = '';
    first.points.forEach((p, i) => {
      const month = p.date.slice(0, 7);
      if (month !== lastMonth) {
        lastMonth = month;
        if (i > 0) out.push({ i, label: formatDayStable(p.date, { day: false, year: p.date.slice(5, 7) === '01' ? 'short' : false }) });
      }
    });
    const every = Math.ceil(out.length / Math.max(2, Math.floor(innerW / 70)));
    return out.filter((_, k) => k % every === 0);
  }, [first, innerW]);

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

  const cursorPoint = cursor !== null && first ? first.points[cursor] : null;
  const readout = cursorPoint
    ? `${formatDayStable(cursorPoint.date)}: ${visible.map(l => `${l.label} ${l.points[cursor ?? 0]?.value != null ? fmt(l.points[cursor ?? 0].value as number) : '—'}`).join(', ')}`
    : '';
  const tipLeft = cursor !== null ? Math.min(width - 190, Math.max(0, x(cursor) - 90)) : 0;

  return (
    <figure className={cn('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <figcaption className="kicker">{caption}</figcaption>
        <Segmented
          size="sm"
          label={t('rangeLabel')}
          value={range}
          onValueChange={setRange}
          options={(Object.keys(RANGE_WEEKS) as Range[]).map(r => ({ value: r, label: t(`range.${r}`) }))}
        />
      </div>
      {lines.length > 1 ? (
        <ul className="flex flex-wrap gap-4 text-[13px]">
          {lines.map(l => (
            <li key={l.id} className="inline-flex items-center gap-2">
              <span aria-hidden className={cn('h-0.5 w-5 rounded-full', l.tone === 'ink' ? 'bg-ink' : 'bg-accent', l.tone === 'accent' && 'bg-[repeating-linear-gradient(90deg,var(--accent)_0_5px,transparent_5px_8px)]')} />
              {l.label}
            </li>
          ))}
        </ul>
      ) : null}
      <div ref={wrap} className="relative w-full select-none">
        {hasData ? (
          <svg
            role="img"
            aria-label={`${caption}. ${tm(`${metric}.label`)}`}
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
            <defs>
              <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="var(--ink)" stopOpacity="0.1" />
                <stop offset="100%" stopColor="var(--ink)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map(v => (
              <g key={v}>
                <line x1={m.l} x2={m.l + innerW} y1={y(v)} y2={y(v)} className="stroke-rule" strokeDasharray={v === yMin ? undefined : '2 3'} />
                <text x={width - m.r + 8} y={y(v)} dy="0.32em" className="fill-muted font-mono text-[10.5px]">{fmt(v)}</text>
              </g>
            ))}
            {monthTicks.map(tk => (
              <text key={tk.i} x={x(tk.i)} y={height - 8} textAnchor="middle" className="fill-muted font-mono text-[10.5px]">{tk.label}</text>
            ))}
            {area ? <path d={area} fill={`url(#${gradId})`} /> : null}
            {paths.map((d, k) => (
              <path
                key={visible[k].id}
                d={d}
                fill="none"
                strokeWidth={visible[k].tone === 'ink' ? 1.75 : 1.75}
                strokeDasharray={visible[k].tone === 'accent' ? '5 3' : undefined}
                strokeLinejoin="round"
                className={visible[k].tone === 'ink' ? 'stroke-ink' : 'stroke-accent'}
              />
            ))}
            {cursor !== null ? (
              <g aria-hidden>
                <line x1={x(cursor)} x2={x(cursor)} y1={m.t} y2={m.t + innerH} className="stroke-ink/40" />
                {visible.map(l => {
                  const v = l.points[cursor]?.value;
                  return v == null ? null : <circle key={l.id} cx={x(cursor)} cy={y(v)} r={3.5} className={cn('stroke-surface', l.tone === 'ink' ? 'fill-ink' : 'fill-accent')} strokeWidth={2} />;
                })}
              </g>
            ) : null}
          </svg>
        ) : (
          <p className="grid place-items-center rounded-md border border-dashed border-rule text-sm text-muted" style={{ height }}>{t('noData')}</p>
        )}
        {cursorPoint ? (
          <div aria-hidden className="pointer-events-none absolute top-0 w-[180px] rounded-[4px] bg-ink px-2.5 py-2 text-[12px] text-paper shadow-float" style={{ left: tipLeft }}>
            <p className="font-mono text-[10.5px] uppercase tracking-wider text-paper/70">{formatDayStable(cursorPoint.date)}</p>
            {visible.map(l => {
              const v = l.points[cursor ?? 0]?.value;
              return (
                <p key={l.id} className="num mt-0.5 flex justify-between gap-3">
                  <span className="truncate text-paper/80">{l.label}</span>
                  <span className="font-medium">{v == null ? '—' : fmt(v)}</span>
                </p>
              );
            })}
          </div>
        ) : null}
        <p className="sr-only" aria-live="polite">{readout}</p>
      </div>
      <div>
        <Button variant="link" size="sm" onClick={() => setShowTable(s => !s)} aria-expanded={showTable}>
          {showTable ? t('hideTable') : t('showTable')}
        </Button>
        {showTable ? (
          <div tabIndex={0} role="region" aria-label={caption} className="mt-2 max-h-72 overflow-auto rounded-md border border-rule focus-visible:outline-offset-2">
            <table className="w-full text-[13px]">
              <caption className="sr-only">{caption}</caption>
              <thead className="sticky top-0 bg-sunken">
                <tr>
                  <th scope="col" className="kicker px-3 py-2 text-left">{t('week')}</th>
                  {visible.map(l => <th key={l.id} scope="col" className="kicker px-3 py-2 text-right">{l.label}</th>)}
                </tr>
              </thead>
              <tbody className="num">
                {[...(first?.points ?? [])].map((p, i) => ({ p, i })).reverse().map(({ p, i }) => (
                  <tr key={p.date} className="border-t border-rule">
                    <th scope="row" className="px-3 py-1.5 text-left font-normal text-ink-2">{formatDayStable(p.date)}</th>
                    {visible.map(l => {
                      const v = l.points[i]?.value;
                      return <td key={l.id} className="px-3 py-1.5 text-right">{v == null ? '—' : fmt(v)}</td>;
                    })}
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
