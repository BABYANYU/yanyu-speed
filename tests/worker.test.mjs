import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../worker.js', import.meta.url), 'utf8');
const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
const call = (path, init, env = {}) => worker.fetch(new Request(`https://yanyubaby.eu.org${path}`, init), env);

test('ping is uncached; unsupported methods and cross-site traffic are rejected', async () => {
  const ping = await call('/api/ping', { method: 'HEAD' });
  assert.equal(ping.status, 204);
  assert.match(ping.headers.get('Cache-Control'), /no-store/);
  assert.equal((await call('/api/ping', { method: 'POST' })).status, 405);
  assert.equal((await call('/api/download', { headers: { Origin: 'https://other.example' } })).status, 403);
  assert.equal((await call('/api/download', { headers: { 'Sec-Fetch-Site': 'cross-site' } })).status, 403);
  assert.equal((await call('/api/missing')).status, 404);
});

test('download streams exactly 32 MiB and supports cancellation and HEAD', async () => {
  const response = await call('/api/download');
  let bytes = 0;
  for await (const chunk of response.body) bytes += chunk.byteLength;
  assert.equal(bytes, 32 * 1024 * 1024);
  assert.equal(Number(response.headers.get('Content-Length')), bytes);
  assert.equal(response.headers.get('Content-Encoding'), 'identity');
  const head = await call('/api/download', { method: 'HEAD' });
  assert.equal(head.body, null);
  const cancelled = await call('/api/download');
  await cancelled.body.cancel();
});

test('upload counts bytes, rejects oversized streams and handles a disconnected client', async () => {
  const response = await call('/api/upload', { method: 'POST', body: 'test' });
  assert.deepEqual(await response.json(), { received: 4 });
  const tooLarge = await call('/api/upload', { method: 'POST', headers: { 'Content-Length': String(33 * 1024 * 1024) } });
  assert.equal(tooLarge.status, 413);
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(1024 * 1024)); },
    cancel() { cancelled = true; }
  });
  assert.equal((await call('/api/upload', { method: 'POST', body, duplex: 'half' })).status, 413);
  assert.equal(cancelled, true);
  const broken = new ReadableStream({ start(controller) { controller.error(new Error('disconnected')); } });
  assert.equal((await call('/api/upload', { method: 'POST', body: broken, duplex: 'half' })).status, 400);
});

test('geo comes from CF metadata and static requests use the assets binding', async () => {
  const request = new Request('https://yanyubaby.eu.org/api/geo', { headers: { 'CF-Connecting-IP': '192.0.2.1' } });
  request.cf = { country: 'JP', asOrganization: 'Example ISP', asn: 64500 };
  const geo = await (await worker.fetch(request, {})).json();
  assert.equal(geo.ip, '192.0.2.1');
  assert.equal(geo.country_code, 'JP');
  assert.equal(geo.asn, 64500);
  const asset = await call('/', undefined, { ASSETS: { fetch: () => new Response('asset') } });
  assert.equal(await asset.text(), 'asset');
});
