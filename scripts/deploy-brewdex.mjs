// Official direct-upload API: https://developers.cloudflare.com/workers/static-assets/direct-upload/
// Wrangler still builds the multipart bundle; only Brewdex endpoints are used here.
import { readFile, readdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { createHash } from 'node:crypto';

const token = (process.env.CLOUDFLARE_API_TOKEN || '').trim();
if (!token || /\s/.test(token)) throw new Error('A valid deployment token is required');
const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8'));
if (config.name !== 'brewdex' || config.account_id !== 'b1eb3d7d03b40f01f9e9c3ef18cf00d5') throw new Error('Unexpected deployment target');
const base = `https://api.cloudflare.com/client/v4/accounts/${config.account_id}`;
async function api(path, init = {}, credential = token) {
  const response = await fetch(base + path, { ...init, headers: { ...init.headers, Authorization: `Bearer ${credential}` }, signal: AbortSignal.timeout(120000) });
  const body = await response.json();
  if (!response.ok || !body.success) throw new Error(`Cloudflare ${path}: HTTP ${response.status}; error codes ${(body.errors || []).map(e => e.code).join(',')}`);
  return body.result;
}
const bytes = await readFile('.wrangler/worker.bundle');
const boundary = bytes.subarray(0, bytes.indexOf('\r\n')).toString().slice(2);
if (!boundary || boundary.length > 200) throw new Error('Invalid Wrangler bundle');
const form = await new Response(bytes, { headers: { 'Content-Type': `multipart/form-data; boundary=${boundary}` } }).formData();
const part = form.get('metadata');
const metadata = JSON.parse(typeof part === 'string' ? part : await part.text());
// Fail closed before any upload if the gate or its required bindings disappeared.
if (config.assets?.run_worker_first !== true) throw new Error('All requests must pass through the invite gate');
for (const name of ['ASSETS', 'WORKER_SELF_REFERENCE', 'INVITE_RATE_LIMITER']) {
  if (!metadata.bindings?.some(b => b.name === name)) throw new Error(`Missing binding ${name}`);
}
// Wrangler dry-run omits assets metadata because no upload session exists yet.
metadata.assets = { config: { run_worker_first: true, html_handling: config.assets.html_handling, not_found_handling: config.assets.not_found_handling } };
metadata.keep_bindings = [...new Set([...(metadata.keep_bindings || []), 'secret_text', 'secret_key'])];
const manifest = {};
const byHash = new Map();
const types = { '.js': 'application/javascript', '.css': 'text/css', '.html': 'text/html', '.json': 'application/json', '.txt': 'text/plain', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2', '.wasm': 'application/wasm', '.map': 'application/json' };
async function walk(relative = '') {
  for (const entry of await readdir(join(config.assets.directory, relative), { withFileTypes: true })) {
    const path = join(relative, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile()) {
      if (['_headers', '_redirects', '.assetsignore'].includes(entry.name)) throw new Error('Asset configuration file requires explicit deployment support');
      const content = await readFile(join(config.assets.directory, path));
      const extension = extname(path);
      const hash = createHash('sha256').update(content.toString('base64') + extension).digest('hex').slice(0, 32);
      manifest['/' + path.replaceAll('\\', '/')] = { hash, size: content.length };
      byHash.set(hash, { path, type: types[extension] || 'application/octet-stream' });
    } else throw new Error('Unsupported asset entry');
  }
}
await walk();
if (!Object.keys(manifest).length) throw new Error('Missing application assets');
const session = await api('/workers/scripts/brewdex/assets-upload-session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ manifest }) });
if (!session.jwt || !Array.isArray(session.buckets)) throw new Error('Invalid asset upload session');
let completion = session.buckets.length ? undefined : session.jwt;
for (const bucket of session.buckets) {
  const upload = new FormData();
  for (const hash of bucket) {
    const asset = byHash.get(hash);
    if (!asset) throw new Error('Unexpected requested asset');
    const content = await readFile(join(config.assets.directory, asset.path));
    upload.append(hash, new Blob([content.toString('base64')], { type: asset.type }), hash);
  }
  const result = await api('/workers/assets/upload?base64=true', { method: 'POST', body: upload }, session.jwt);
  if (result.jwt) completion = result.jwt;
}
if (!completion) throw new Error('Asset upload did not finish');
metadata.assets.jwt = completion;
form.set('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
// This updates only the named Worker. Existing custom domains and secrets are retained.
const deployed = await api('/workers/scripts/brewdex', { method: 'PUT', body: form });
console.log(`Brewdex uploaded successfully; ${Object.keys(manifest).length} assets; deployment ${deployed.deployment_id || deployed.id || 'accepted'}`);
