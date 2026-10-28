/** Frame calculation stays independent of React, clocks and browser APIs. */
export type RandomSource = () => number;

function alphabet(char: string, index: number, chars: string[]): string | null {
  if (/[0-9]/.test(char)) return '0123456789';
  // Keep compact numeric suffixes literal, including the formatter's lowercase k.
  if (/[kKmMbB]/.test(char) && /[0-9]/.test(chars[index - 1] ?? '') && !/[a-z0-9]/i.test(chars[index + 1] ?? '')) return null;
  return /[a-z]/i.test(char) ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : null;
}

/** Scramble first, then settle eligible characters from left to right. */
export function decodeFrame(value: string, progress: number, rng: RandomSource = Math.random): string {
  if (!Number.isFinite(progress) || progress >= 1) return value;
  const chars = Array.from(value);
  const pools = chars.map(alphabet);
  const count = pools.filter(Boolean).length;
  const settled = Math.floor(Math.max(0, (progress - 0.25) / 0.75) * count);
  let position = 0;
  return chars.map((char, index) => {
    const pool = pools[index];
    if (!pool || position++ < settled) return char;
    const sample = rng();
    const bounded = Number.isFinite(sample) ? Math.min(1 - Number.EPSILON, Math.max(0, sample)) : 0;
    return pool[Math.floor(bounded * pool.length)];
  }).join('');
}
