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
import { DirectionGlyph, GLYPH_SLOT, signDirection, WithGlyph } from './direction-glyph';
import { MetricInfo } from './metric-info';
import { SourceBadge } from './source-badge';

// Finviz-style heatmap: area = job ads in the window, colour = 4-week change.
// Desktop draws a squarified treemap; phones get a stacked grid in the same
// colours. Every tile is a link with a spoken summary, and the same numbers
// are available to screen readers as a table (PRD §10.1: every number has a
// definition and source, one click away in the legend).

const STEP_CLASS: Record<string, string> = { '-2': 'heat-dn2', '-1': 'heat-dn1', '0': 'heat-0', '1': 'heat-up1', '2': 'heat-up2', na: 'heat-na' };
const LEGEND_STEPS: HeatStep[] = [-2, -1, 0, 1, 2];
const STEP_KEY = { '-2': 'dn2', '-1': 'dn1', '0': 'flat', '1': 'up1', '2': 'up2' } as const;
const STEP_DIR = { '-2': 'down', '-1': 'down', '0': 'flat', '1': 'up', '2': 'up' } as const;

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

/** The tile's change with its ▲/▼/■; the tile's aria-label already says up or down. */
function TileChange({ tile, fallback }: { tile: HeatTile; fallback: string }) {
  const text = changeText(tile);
  if (text === null || tile.change.value === null) return <>{fallback}</>;
  return <span className="whitespace-nowrap"><DirectionGlyph dir={signDirection(tile.change.value)} spoken={false} className="mr-[0.2em] text-[0.6em]" />{text}</span>;
}

export function HeatmapLegend({ heatmap, filter, className }: { heatmap: Heatmap; filter: FilterSpec; className?: string }) {
  const t = useTranslations('Heatmap');
  const sample = heatmap.tiles.find(x => x.ads.status === 'ok') ?? heatmap.tiles[0];
  const flat = Math.round(HEAT_BANDS.flat * 100);
  const strong = Math.round(HEAT_BANDS.strong * 100);
  const window = sample?.ads.window;
  const minSample = sample?.change.min_sample ?? MIN_SAMPLE_DEFAULT;
  const type = heatmap.kind === 'industries' ? 'industry' : 'skill';
  return (
    <div className={cn('text-[12px] leading-snug text-muted', className)}>
      {/* Inline flow, not flex: the chips wrap word by word and the info buttons stay beside them. */}
      <div className="leading-[24px] [&>*]:align-middle">
        <MetricInfo metric="change_4w" type={type} reading={sample?.change} filter={filter} className="mr-1.5" />
        <ul className="inline" aria-label={t('legendLabel')}>
          {LEGEND_STEPS.map(step => (
            <li key={String(step)} className={cn('mr-1 inline-flex items-center gap-1 rounded-[3px] px-2 py-0.5 align-middle font-mono text-[11px] leading-snug', STEP_CLASS[String(step)])}>
              <DirectionGlyph dir={STEP_DIR[String(step) as keyof typeof STEP_DIR]} />
              {t(`band.${STEP_KEY[String(step) as keyof typeof STEP_KEY]}`, { flat, strong })}
            </li>
          ))}
          <li className="heat-na mr-2 inline-flex rounded-[3px] px-2 py-0.5 align-middle font-mono text-[11px] leading-snug ring-1 ring-inset ring-rule">{t('band.na', { min: minSample })}</li>
        </ul>
        <span className="inline-flex flex-wrap items-center gap-x-2">
          <SourceBadge kind="ads" />
          {window ? <span>{t('window', { start: formatDate(window.start), end: formatDate(window.end) })}</span> : null}
          <MetricInfo metric="ad_count" type={type} reading={heatmap.kind === 'industries' ? sample?.ads : undefined} filter={filter} />
        </span>
      </div>
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
                    <span className="num font-serif text-[18px] leading-none lg:text-[22px]"><TileChange tile={tile} fallback={t('thinShort')} /></span>
                  </>
                ) : small ? (
                  <span className="flex h-full flex-col justify-center font-mono text-[11px] leading-tight">
                    <span>{tile.symbol}</span>
                    <span className="num"><TileChange tile={tile} fallback="—" /></span>
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
              <span className="num font-serif text-[18px] leading-none"><TileChange tile={tile} fallback={t('thinShort')} /></span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The same numbers as a table, visually hidden: screen readers get every figure without the treemap. */
export function HeatmapTable({ heatmap, caption, nameHead }: { heatmap: Heatmap; caption: string; nameHead: string }) {
  const t = useTranslations('Heatmap');
  return (
    // A wrapper, not the table itself: an absolutely positioned table can still widen the page.
    <div className="sr-only">
      <table>
        <caption>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{nameHead}</th>
            <th scope="col">{t('colAds')}</th>
            <th scope="col">{t('colChange')}</th>
          </tr>
        </thead>
        <tbody>
          {heatmap.tiles.map(tile => {
            const text = changeText(tile);
            return (
              <tr key={tile.slug}>
                <th scope="row">{tile.name}</th>
                <td>{formatCount(tileArea(tile))}</td>
                <td>
                  {text !== null && tile.change.value !== null
                    ? <WithGlyph dir={signDirection(tile.change.value)} text={t('changeCell', { change: `${GLYPH_SLOT}${text}`, from: formatCount(tile.change.from ?? 0), to: formatCount(tile.change.to ?? 0) })} />
                    : t('thinCell', { min: tile.change.min_sample })}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
