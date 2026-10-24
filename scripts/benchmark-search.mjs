import { performance } from 'node:perf_hooks';
import { createSearch } from '../src/lib/search/matcher.ts';

const queries = ['python', 'pyhton', 'javascrpt', 'kubernets', 'engineer software', 'c++', 'zzzzzzzz'];
const fixtures = [
  { id: 0, name: 'Python', aliases: ['py'] },
  { id: 1, name: 'JavaScript', aliases: ['js'] },
  { id: 2, name: 'Kubernetes', aliases: ['k8s'] },
  { id: 3, name: 'Software Engineer', aliases: ['developer'] },
  { id: 4, name: 'C++', aliases: ['cpp'] },
  { id: 5, name: 'C#', aliases: ['csharp'] },
];
const expected = [0, 0, 1, 2, 3, 4, null];
const fields = i => [{ text: i.name, kind: 'name' }, ...i.aliases.map(text => ({ text, kind: 'alias' })), ...(i.symbol ? [{ text: i.symbol, kind: 'symbol', fuzzy: false }] : [])];
const report = { runtime: process.version, platform: `${process.platform}/${process.arch}`, fuse: '7.5.0', results: [] };
const corpora = [fixtures.length, 1000, 10000].map(count => ({
  label: count === fixtures.length ? 'fixtures' : 'synthetic',
  items: Array.from({ length: count }, (_, id) => id < fixtures.length ? fixtures[id] : ({ id, name: `Sample catalogue item ${id}`, aliases: [`catalogue ${id}`] })),
  expected,
}));
if (process.env.SEARCH_CATALOGUE_MODULE) {
  const { INSTRUMENTS } = await import(process.env.SEARCH_CATALOGUE_MODULE);
  corpora.unshift({ label: 'catalogue', items: INSTRUMENTS.map(i => ({ ...i, id: i.slug })), expected: ['python', 'python', 'javascript', 'kubernetes', 'software-engineer', 'cpp', null] });
}
for (const { label, items, expected: wanted } of corpora) {
  global.gc?.();
  const before = process.memoryUsage().heapUsed;
  const start = performance.now();
  const search = createSearch(items, fields);
  const buildMs = performance.now() - start;
  const heapDeltaBytes = process.memoryUsage().heapUsed - before;
  const actual = queries.map(q => search(q, { limit: 3 }).map(h => h.item.id));
  for (const q of queries) search(q, { limit: 12 });
  const timings = [];
  for (let round = 0; round < 10; round++) for (const q of queries) {
    const t = performance.now(); search(q, { limit: 12 }); timings.push(performance.now() - t);
  }
  timings.sort((a, b) => a - b);
  report.results.push({ label, count: items.length, buildMs, heapDeltaBytes, medianMs: timings[Math.floor(timings.length / 2)], p95Ms: timings[Math.floor(timings.length * .95)], queries: Object.fromEntries(queries.map((q, i) => [q, actual[i]])) });
  if (actual.some((ids, i) => wanted[i] === null ? ids.length !== 0 : !ids.includes(wanted[i]))) throw new Error('Search quality regression');
}
// Optional comparison dependency lives outside the production dependency graph.
if (process.env.MINISEARCH_MODULE) {
  const { default: MiniSearch } = await import(process.env.MINISEARCH_MODULE);
  const mini = new MiniSearch({ fields: ['name', 'aliases'], storeFields: ['name'], searchOptions: { prefix: true, fuzzy: .34, combineWith: 'AND' } });
  mini.addAll(fixtures.map(i => ({ ...i, aliases: i.aliases.join(' ') })));
  report.minisearch = { version: '7.2.0', queries: Object.fromEntries(queries.map(q => [q, mini.search(q).slice(0, 3).map(h => h.id)])) };
}
console.log(JSON.stringify(report, null, 2));
