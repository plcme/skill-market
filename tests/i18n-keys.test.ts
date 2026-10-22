import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadMessages } from '@/i18n/messages';

// Guards against copy regressions like a deleted key still used elsewhere
// (FE-R3: /compare rendered "InstrumentPage.chartCaption"). next-intl keys are
// untyped, so scan `src` for static keys and check each one exists.

const ROOT = join(__dirname, '..', 'src');

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

function lookup(messages: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce<unknown>((node, part) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[part] : undefined), messages);
}

const BINDING = /(?:const|let)\s+(\w+)\s*=\s*(?:await\s+)?(?:useTranslations|getTranslations)\(\s*'([^']+)'\s*\)/g;

/** Every static `t('key')`, `t.rich('key')` and `t.raw('key')`, resolved against the binding in scope at that point. */
function staticKeys(source: string): Array<{ key: string; index: number }> {
  const bindings = [...source.matchAll(BINDING)].map(m => ({ name: m[1], ns: m[2], index: m.index ?? 0 }));
  const out: Array<{ key: string; index: number }> = [];
  for (const name of new Set(bindings.map(b => b.name))) {
    const call = new RegExp(`(?<![\\w.])${name}(?:\\.rich|\\.raw|\\.markup)?\\(\\s*'([^'\\n]+)'`, 'g');
    for (const m of source.matchAll(call)) {
      const index = m.index ?? 0;
      const binding = bindings.filter(b => b.name === name && b.index < index).at(-1);
      if (binding) out.push({ key: `${binding.ns}.${m[1]}`, index });
    }
  }
  return out;
}

describe('message keys used in src exist in messages/en', () => {
  it('finds no missing static keys', async () => {
    const messages = await loadMessages('en');
    const missing: string[] = [];
    let checked = 0;
    for (const file of files(ROOT)) {
      const source = readFileSync(file, 'utf8');
      for (const { key, index } of staticKeys(source)) {
        checked++;
        if (lookup(messages, key) === undefined) {
          const line = source.slice(0, index).split('\n').length;
          missing.push(`${relative(ROOT, file)}:${line} ${key}`);
        }
      }
    }
    expect(checked).toBeGreaterThan(500);
    expect(missing).toEqual([]);
  });

  it('the scanner resolves each binding in scope', () => {
    const src = `function A() { const t = useTranslations('One'); return t('a'); }\nfunction B() { const t = useTranslations('Two'); return t.rich('b') + t(\`dyn.\${x}\`); }`;
    expect(staticKeys(src).map(k => k.key)).toEqual(['One.a', 'Two.b']);
  });
});
