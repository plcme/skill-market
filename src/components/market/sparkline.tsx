import { cn } from '@/lib/utils';
import type { Direction } from '@/lib/market/format';

/** Tiny inline trend. Has an accessible name + description (NFR-3). */
export function Sparkline({ values, label, description, dir = 'flat', width = 96, height = 28, className }: {
  values: number[];
  label: string;
  description: string;
  dir?: Direction;
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pad = 2;
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (width - pad * 2), pad + (1 - (v - min) / span) * (height - pad * 2)] as const);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg role="img" viewBox={`0 0 ${width} ${height}`} width={width} height={height} className={cn('overflow-visible', className)}>
      <title>{label}</title>
      <desc>{description}</desc>
      <path d={d} fill="none" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" className={cn(dir === 'up' && 'stroke-up', dir === 'down' && 'stroke-down', dir === 'flat' && 'stroke-ink/60')} />
      <circle cx={last[0]} cy={last[1]} r={2.25} className={cn(dir === 'up' && 'fill-up', dir === 'down' && 'fill-down', dir === 'flat' && 'fill-ink/60')} />
    </svg>
  );
}
