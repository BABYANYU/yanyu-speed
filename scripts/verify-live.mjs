import assert from 'node:assert/strict';

const base = new URL(process.argv[2] ?? 'https://speed.fakeyou.eu.org/');
const request = (path, options = {}) => fetch(new URL(path, base), { cache: 'no-store', signal: AbortSignal.timeout(15000), ...options });
const home = await request('/');
assert.equal(home.status, 200);
const html = await home.text();
const heading = html.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1].replace(/<[^>]*>/g, '');
assert.equal(heading, 'Yanyu · Speed');
assert.ok(!html.includes('由烟雨定制与运营'));
assert.ok(!html.includes('href="/licenses.html"'));
const singleSwitch = html.match(/<[^>]+aria-label="Use a single connection"[^>]*>/)?.[0];
assert.match(singleSwitch ?? '', /aria-checked="true"/);
console.log('PASS: homepage brand, footer removal, Single default');

const ping = await request('/api/ping', { method: 'HEAD' });
assert.equal(ping.status, 204);
assert.match(ping.headers.get('Cache-Control'), /no-store/);
const upload = await request('/api/upload', { method: 'POST', body: 'test' });
assert.equal(upload.status, 200);
assert.deepEqual(await upload.json(), { received: 4 });
const download = await request('/api/download', { method: 'HEAD' });
assert.equal(download.status, 200);
assert.equal(Number(download.headers.get('Content-Length')), 32 * 1024 * 1024);
const data = await request('/api/download');
assert.equal(data.status, 200);
const reader = data.body.getReader();
assert.ok((await reader.read()).value.byteLength > 0);
await reader.cancel();
const geoResponse = await request('/api/geo');
assert.equal(geoResponse.status, 200);
assert.match(geoResponse.headers.get('Cache-Control'), /no-store/);
assert.ok('country_code' in await geoResponse.json());
assert.equal((await request('/api/ping', { method: 'POST' })).status, 405);
assert.equal((await request('/api/missing')).status, 404);
console.log('PASS: ping, streamed download, upload, geo, method and missing-route handling');

for (const path of ['/licenses.html', '/LICENSE.txt', '/THIRD_PARTY_NOTICES.txt', '/DEPENDENCY-LICENSES.txt', '/FONT-LICENSE.txt']) {
  const response = await request(path);
  assert.equal(response.status, 200, path);
  await response.body?.cancel();
}
const assetPath = html.match(/src="([^"?]*\/_next\/static\/[^"?]*\.js)/)?.[1];
assert.ok(assetPath);
const asset = await request(assetPath, { method: 'HEAD' });
assert.equal(asset.status, 200);
assert.match(asset.headers.get('Cache-Control'), /immutable/);
assert.equal(asset.headers.get('X-Content-Type-Options'), 'nosniff');
console.log('PASS: license files, JS assets, immutable cache and response headers');
