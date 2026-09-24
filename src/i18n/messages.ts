// Copy lives in messages/<locale>/<area>.json; each file owns distinct top-level
// namespaces so areas can be edited independently.
const AREAS = ['common', 'market', 'market-pages', 'home', 'student', 'community', 'admin', 'legal'] as const;

export async function loadMessages(locale: 'en'): Promise<Record<string, unknown>> {
  const parts = await Promise.all(AREAS.map(area => import(`../../messages/${locale}/${area}.json`).then(m => m.default as Record<string, unknown>).catch(() => ({}))));
  const merged: Record<string, unknown> = {};
  for (const part of parts) {
    for (const [ns, value] of Object.entries(part)) {
      if (ns in merged) throw new Error(`Duplicate message namespace "${ns}"`);
      merged[ns] = value;
    }
  }
  return merged;
}
