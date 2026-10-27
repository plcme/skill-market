import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { DecodeText } from '@/components/motion/decode-text';

describe('DecodeText server rendering', () => {
  it('renders the real formatted value without consulting randomness or browser APIs', () => {
    const random = vi.spyOn(Math, 'random');
    try {
      const html = renderToStaticMarkup(createElement(DecodeText, { value: '−$125.5k', delay: 70 }));
      expect(html).toContain('<span class="sr-only">−$125.5k</span>');
      expect(html).toContain('<span aria-hidden="true">');
      expect(html).toContain('class="invisible"');
      expect(random).not.toHaveBeenCalled();
    } finally {
      random.mockRestore();
    }
  });

  it('keeps every visual glyph inside an aria-hidden layer, with one real spoken value', () => {
    const html = renderToStaticMarkup(createElement(DecodeText, { value: '+12.3%' }));
    expect(html.match(/class="sr-only"/g)).toHaveLength(1);
    const visual = html.slice(html.indexOf('<span aria-hidden="true">'));
    expect(visual.match(/class="invisible"/g)).toHaveLength(6);
    expect(visual.match(/absolute inset-0 overflow-hidden text-center/g)).toHaveLength(6);
  });
});
