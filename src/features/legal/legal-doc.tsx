import 'server-only';
import Link from 'next/link';
import { getTranslations } from 'next-intl/server';
import { FileWarning } from 'lucide-react';
import { APP_NAME } from '@/config/app';
import { formatDate } from '@/lib/time';
import { Container, Notice, PageHeader } from '@/components/ui/primitives';
import { cn } from '@/lib/utils';

export const LEGAL_DOCS = ['privacy', 'terms', 'conduct', 'reliability'] as const;
export type LegalDoc = (typeof LEGAL_DOCS)[number];
export const LEGAL_UPDATED = '2026-09-24';

export function isLegalDoc(v: string): v is LegalDoc {
  return (LEGAL_DOCS as readonly string[]).includes(v);
}

type Block = { kind: 'p'; key: string } | { kind: 'ul'; keys: string[] };

/** Paragraph keys `p*` render as paragraphs; consecutive `li*` keys become one list. */
function blocks(keys: string[]): Block[] {
  const out: Block[] = [];
  for (const k of keys) {
    const last = out[out.length - 1];
    if (k.startsWith('li')) {
      if (last?.kind === 'ul') last.keys.push(k);
      else out.push({ kind: 'ul', keys: [k] });
    } else out.push({ kind: 'p', key: k });
  }
  return out;
}

/** A draft legal document with table of contents (FR-A6, APP 1). */
export async function LegalDocument({ doc }: { doc: LegalDoc }) {
  const t = await getTranslations('Legal');
  const vars = { app: APP_NAME };
  const base = `docs.${doc}`;
  const sections = t.raw(`${base}.sections`) as Record<string, { heading: string; body: Record<string, string> }>;
  const keys = Object.keys(sections);
  return (
    <Container className="pb-24">
      <PageHeader kicker={t('kicker')} title={t(`${base}.title`)} lede={t(`${base}.lede`, vars)}>
        <p className="num mt-4 text-[13px] text-muted">{t('updated', { date: formatDate(`${LEGAL_UPDATED}T00:00:00Z`) })}</p>
      </PageHeader>
      <Notice tone="warn" icon={FileWarning} title={t('draft')} className="mb-10 max-w-3xl">{t('draftBody')}</Notice>
      <div className="grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-labelledby="toc-h" className="lg:sticky lg:top-24 lg:self-start">
          <p id="toc-h" className="kicker mb-3">{t('toc')}</p>
          <ol className="flex flex-col gap-1.5 border-l border-rule pl-4 text-sm">
            {keys.map(k => <li key={k}><a href={`#${k}`} className="text-ink-2 hover:text-ink hover:underline">{t(`${base}.sections.${k}.heading`)}</a></li>)}
          </ol>
          <p className="kicker mb-3 mt-8">{t('other')}</p>
          <ul className="flex flex-col gap-1.5 text-sm">
            {LEGAL_DOCS.filter(d => d !== doc).map(d => <li key={d}><Link href={`/legal/${d}`} className="link">{t(`names.${d}`)}</Link></li>)}
          </ul>
        </nav>
        <article className="max-w-[68ch]">
          {keys.map((k, i) => (
            <section key={k} id={k} aria-labelledby={`${k}-h`} className={cn('scroll-mt-24', i > 0 && 'mt-10')}>
              <h2 id={`${k}-h`} className="border-t-2 border-rule-strong pt-3 font-serif text-[26px] leading-tight">{t(`${base}.sections.${k}.heading`)}</h2>
              {blocks(Object.keys(sections[k].body)).map(b => b.kind === 'p'
                ? <p key={b.key} className="mt-4 text-[16px] leading-relaxed text-ink-2">{t(`${base}.sections.${k}.body.${b.key}`, vars)}</p>
                : (
                  <ul key={b.keys[0]} className="mt-4 flex list-disc flex-col gap-2 pl-5 text-[16px] leading-relaxed text-ink-2 marker:text-faint">
                    {b.keys.map(li => <li key={li}>{t(`${base}.sections.${k}.body.${li}`, vars)}</li>)}
                  </ul>
                ))}
            </section>
          ))}
        </article>
      </div>
    </Container>
  );
}
