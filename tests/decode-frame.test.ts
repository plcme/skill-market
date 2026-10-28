import { describe, expect, it, vi } from 'vitest';
import { decodeFrame } from '@/components/motion/decode-frame';

const zero = () => 0;
const high = () => 0.999;

describe('decodeFrame', () => {
  it('scrambles digits only into digits and letters only into A–Z', () => {
    expect(decodeFrame('a1B2', 0, zero)).toBe('A0A0');
    expect(decodeFrame('a1B2', 0, high)).toBe('Z9Z9');
  });

  it('keeps signs, currency, decimal/group separators, arrows and whitespace literal', () => {
    expect(decodeFrame('+ − % $ , . → \t\n', 0, zero)).toBe('+ − % $ , . → \t\n');
    expect(decodeFrame('$123,456.78 → −9.1%', 0, zero)).toBe('$000,000.00 → −0.0%');
  });

  it('keeps compact numeric suffixes, while still scrambling ordinary letters', () => {
    expect(decodeFrame('$125k → 2.3M', 0, high)).toBe('$999k → 9.9M');
    expect(decodeFrame('book', 0, zero)).toBe('AAAA');
  });

  it('scrambles all eligible positions for the first quarter of the duration', () => {
    expect(decodeFrame('1234', 0.24, zero)).toBe('0000');
  });

  it('settles from left to right, without counting literal characters', () => {
    expect(decodeFrame('12 → 34', 0.4375, zero)).toBe('10 → 00');
    expect(decodeFrame('12 → 34', 0.625, zero)).toBe('12 → 00');
    expect(decodeFrame('12 → 34', 0.8125, zero)).toBe('12 → 30');
  });

  it('never changes a settled character when the random source changes', () => {
    expect(decodeFrame('ab12', 0.625, high)).toBe('ab99');
    expect(decodeFrame('ab12', 0.625, zero)).toBe('ab00');
  });

  it('finishes on the exact formatted value without consuming randomness', () => {
    const rng = vi.fn(high);
    expect(decodeFrame('−$12.5k', 1, rng)).toBe('−$12.5k');
    expect(decodeFrame('−$12.5k', 4, rng)).toBe('−$12.5k');
    expect(rng).not.toHaveBeenCalled();
  });

  it('handles empty values, static text and Unicode without breaking code points', () => {
    expect(decodeFrame('', 0, zero)).toBe('');
    expect(decodeFrame('—', 0, zero)).toBe('—');
    expect(decodeFrame('🪙 42 €', 0, zero)).toBe('🪙 00 €');
  });

  it('uses an injected random source deterministically, once per unsettled character', () => {
    const rng = vi.fn().mockReturnValueOnce(0.1).mockReturnValueOnce(0.2);
    expect(decodeFrame('1234', 0.625, rng)).toBe('1212');
    expect(rng).toHaveBeenCalledTimes(2);
  });

  it('bounds an imperfect random source instead of producing undefined glyphs', () => {
    expect(decodeFrame('12ab', 0, () => 1)).toBe('99ZZ');
    expect(decodeFrame('12ab', 0, () => -1)).toBe('00AA');
    expect(decodeFrame('12ab', 0, () => Number.NaN)).toBe('00AA');
  });

  it('clamps negative progress and returns real values for invalid progress', () => {
    expect(decodeFrame('123', -1, zero)).toBe('000');
    expect(decodeFrame('123', Number.NaN, zero)).toBe('123');
    expect(decodeFrame('123', Number.POSITIVE_INFINITY, zero)).toBe('123');
  });
});
