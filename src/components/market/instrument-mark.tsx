import { logoFor } from '@/lib/market/logos';
import { Monogram } from '@/components/ui/primitives';

type Tone = 'plain' | 'ink' | 'signal' | 'accent';
type Size = 'sm' | 'md' | 'lg';

const ICON_SIZE: Record<Size, string> = { sm: 'size-3.5', md: 'size-[18px]', lg: 'size-7' };

/**
 * The instrument's square symbol box. Skills with a recognisable logo show it,
 * monochrome in the box's text colour; everything else keeps its letters.
 * Decorative: the name is always rendered next to it.
 */
export function InstrumentMark({ slug, symbol, tone, size, className }: { slug: string; symbol: string; tone?: Tone; size?: Size; className?: string }) {
  const logo = logoFor(slug);
  return (
    <Monogram tone={tone} size={size} className={className}>
      {logo ? (
        <svg viewBox="0 0 24 24" aria-hidden focusable="false" data-logo={logo.slug} className={ICON_SIZE[size ?? 'md']}>
          <path d={logo.path} fill="currentColor" />
        </svg>
      ) : symbol}
    </Monogram>
  );
}
