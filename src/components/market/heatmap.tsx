import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { formatChange, formatCount } from '@/lib/market/format';
import { heatStep, HEAT_BANDS, tileArea, type HeatStep, type HeatTile, type Heatmap } from '@/lib/market/heatmap';
import { squarify } from '@/lib/market/treemap';
import { instrumentPath } from '@/lib/links';
import { MIN_SAMPLE_DEFAULT } from '@/lib/metrics/registry';
import { formatDate } from '@/lib/time';
import type { FilterSpec } from '@/lib/market/types';
import { cn } from '@/lib/utils';
import { MetricInfo } from './metric-info';
import { SourceBadge } from './source-badge';

// Finviz-style heatmap: area = job ads in the window, colour = 4-week change.
// Desktop draws a squarified treemap; phones get a stacked grid in the same
// colours. Every tile is a link with a spoken summary, and the same numbers
// are available as a table (PRD §10.1: every number has a definition and source).

const STEP_CLASS: Record<string, string> = { '-2': 'heat-dn2', '-1': 'heat-dn1', '0': 'heat-0', '1': 'heat-up1', '2': 'heat-up2', na: 'heat-na' };
const LEGEND_STEPS: HeatStep[] = [-2, -1, 0, 1, 2];

/** Treemap canvas in abstract units; the element keeps the same aspect ratio. */
const W = 100;
const H = 60;

function useTileCopy() {
  const t = useTranslations('Heatmap');
  return (tile: HeatTile) => {
    const ads = formatCount(tileArea(tile));
    const c = tile.change;
    if (heatStep(c) === 'na' || c.value === null) return t('tileLabelThin', { name: tile.name, ads, min: c.min_sample });
    return t('tileLabel', {
      name: tile.name,
      ads,
      dir: c.value > 0 ? 'up' : c.value < 0 ? 'down' : 'flat',
      change: formatChange(Math.abs(c.value)).replace(/^\+/, ''),
      from: formatCount(c.from ?? 0),
      to: formatCount(c.to ?? 0),
    });
  };
}

function changeText(tile: HeatTile): string | null {
  return heatStep(tile.change) === 'na' || tile.change.value === null ? null : formatChange(tile.change.value);
}

export function HeatmapLegend({ heatmap, filter, parentName, className }: { heatmap: Heatmap; filter: FilterSpec; parentName?: string; className?: string }) {
  const t = useTranslations('Heatmap');
  const sample = heatmap.tiles.find(x => x.ads.status === 'ok') ?? heatmap.tiles[0];
  const flat = Math.round(HEAT_BANDS.flat * 100);
  const strong = Math.round(HEAT_BANDS.strong * 100);
  const window = sample?.ads.window;
  const minSample = sample?.change.min_sample ?? MIN_SAMPLE_DEFAULT;
  return (
    <div className={cn('flex flex-col gap-2 text-[12.5px] leading-snug text-ink-2', className)}>
      <p className="flex flex-wrap items-center gap-x-1.5">
        <span className="font-medium text-ink">{t('sizeLabel')}</span>
        <span>{heatmap.kind === 'industries' ? t('sizeIndustries') : t('sizeSkills', { industry: parentName ?? '' })}</span>
        <MetricInfo metric="ad_count" type={heatmap.kind === 'industries' ? 'industry' : 'skill'} reading={heatmap.kind === 'industries' ? sample?.ads : undefined} filter={filter} />
      </p>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
        <span className="font-medium text-ink">{t('colourLabel')}</span>
        <span>{t('colourBody')}</span>
        <MetricInfo metric="change_4w" type={heatmap.kind === 'industries' ? 'industry' : 'skill'} reading={sample?.change} filter={filter} />
      </div>
      <ul className="flex flex-wrap gap-1" aria-label={t('legendLabel')}>
        {LEGEND_STEPS.map(step => (
          <li key={String(step)} className={cn('rounded-[3px] px-2 py-0.5 font-mono text-[11px]', STEP_CLASS[String(step)])}>
            {t(`band.${step === -2 ? 'dn2' : step === -1 ? 'dn1' : step === 0 ? 'flat' : step === 1 ? 'up1' : 'up2'}`, { flat, strong })}
          </li>
        ))}
        <li className="heat-na rounded-[3px] px-2 py-0.5 font-mono text-[11px] ring-1 ring-inset ring-rule">{t('band.na', { min: minSample })}</li>
      </ul>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted">
        <SourceBadge kind="ads" />
        {window ? <span>{t('window', { start: formatDate(window.start), end: formatDate(window.end) })}</span> : null}
        <span>{t('thinNote', { min: minSample })}</span>
      </p>
    </div>
  );
}

export function HeatmapTiles({ heatmap, filter, label, className }: { heatmap: Heatmap; filter: FilterSpec; label: string; className?: string }) {
  const t = useTranslations('Heatmap');
  const spoken = useTileCopy();
  const bySlug = new Map(heatmap.tiles.map(x => [x.slug, x]));
  const laid = squarify(heatmap.tiles.map(x => ({ id: x.slug, value: tileArea(x) })), { x: 0, y: 0, w: W, h: H });
  const href = (tile: HeatTile) => instrumentPath(tile.type, tile.slug, filter);
  const visible = heatmap.tiles.filter(x => tileArea(x) > 0);

  if (!visible.length) return <p className="text-sm text-muted">{t('empty')}</p>;

  return (
    <div className={className}>
      {/* Desktop / tablet: squarified treemap. */}
      <ul aria-label={label} className="relative hidden w-full overflow-hidden rounded-md sm:block" style={{ aspectRatio: `${W} / ${H}` }}>
        {laid.map(box => {
          const tile = bySlug.get(box.id);
          if (!tile) return null;
          const step = heatStep(tile.change);
          const roomy = box.w >= 14 && box.h >= 11;
          const small = !roomy && box.w >= 7 && box.h >= 6;
          return (
            <li key={box.id} className="absolute p-px" style={{ left: `${(box.x / W) * 100}%`, top: `${(box.y / H) * 100}%`, width: `${(box.w / W) * 100}%`, height: `${(box.h / H) * 100}%` }}>
              <Link
                href={href(tile)}
                aria-label={spoken(tile)}
                title={spoken(tile)}
                className={cn('flex size-full flex-col justify-between overflow-hidden rounded-[3px] p-2 outline-offset-[-2px] transition-[filter] hover:brightness-95 focus-visible:outline-2 focus-visible:outline-ink', STEP_CLASS[String(step)])}
              >
                {roomy ? (
                  <>
                    <span lang="en" className="line-clamp-2 hyphens-auto break-words text-[13px] font-medium leading-tight lg:text-[14px]">{tile.name}</span>
                    <span className="flex flex-wrap items-baseline justify-between gap-x-2">
                      <span className="num font-serif text-[18px] leading-none lg:text-[22px]">{changeText(tile) ?? t('thinShort')}</span>
                      <span className="num text-[11.5px]">{t('adsShort', { n: formatCount(tileArea(tile)) })}</span>
                    </span>
                  </>
                ) : small ? (
                  <span className="flex h-full flex-col justify-center font-mono text-[11px] leading-tight">
                    <span>{tile.symbol}</span>
                    <span className="num">{changeText(tile) ?? '—'}</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Phones: stacked grid, same colours, biggest first. */}
      <ul aria-label={label} className="grid grid-cols-2 gap-1 sm:hidden">
        {visible.map((tile, i) => (
          <li key={tile.slug} className={cn(i === 0 && 'col-span-2')}>
            <Link
              href={href(tile)}
              aria-label={spoken(tile)}
              className={cn('flex min-h-[72px] flex-col justify-between gap-1 rounded-[3px] p-2.5 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ink', STEP_CLASS[String(heatStep(tile.change))])}
            >
              <span className="line-clamp-2 text-[13px] font-medium leading-tight">{tile.name}</span>
              <span className="flex items-baseline justify-between gap-2">
                <span className="num font-serif text-[18px] leading-none">{changeText(tile) ?? t('thinShort')}</span>
                <span className="num text-[11.5px]">{t('adsShort', { n: formatCount(tileArea(tile)) })}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The same numbers as a table: for screen readers and anyone who prefers text. */
export function HeatmapTable({ heatmap, caption, nameHead }: { heatmap: Heatmap; caption: string; nameHead: string }) {
  const t = useTranslations('Heatmap');
  return (
    <details className="group mt-3 text-[13px]">
      <summary className="link cursor-pointer select-none text-[13px]">{t('tableToggle')}</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-left">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr className="border-b border-rule-strong">
              <th scope="col" className="kicker py-1.5 pr-3 font-normal">{nameHead}</th>
              <th scope="col" className="kicker py-1.5 pr-3 text-right font-normal">{t('colAds')}</th>
              <th scope="col" className="kicker py-1.5 text-right font-normal">{t('colChange')}</th>
            </tr>
          </thead>
          <tbody>
            {heatmap.tiles.map(tile => (
              <tr key={tile.slug} className="border-b border-rule">
                <th scope="row" className="py-1.5 pr-3 font-medium">{tile.name}</th>
                <td className="num py-1.5 pr-3 text-right">{formatCount(tileArea(tile))}</td>
                <td className="num py-1.5 text-right">
                  {changeText(tile)
                    ? t('changeCell', { change: changeText(tile) ?? '', from: formatCount(tile.change.from ?? 0), to: formatCount(tile.change.to ?? 0) })
                    : t('thinCell', { min: tile.change.min_sample })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
