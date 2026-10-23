import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Run the actual engine with shorter phase budgets; network and concurrency are still real promises/streams.
const directory = new URL('../.test-build/', import.meta.url);
await mkdir(directory, { recursive: true });
const compile = (source) => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
let stability = await readFile(new URL('../src/lib/stability.ts', import.meta.url), 'utf8');
for (const [name, value] of Object.entries({ SAMPLE_INTERVAL: 0.01, WARMUP: 0.015, MIN_DURATION: 0.07, MAX_DURATION: 0.15, WINDOW: 0.03, RESULT_WINDOW: 0.05, CHART_WINDOW: 0.015, STABLE_FOR: 0.02 })) {
  stability = stability.replace(new RegExp(`(const ${name} = )[^;]+;`), `$1${value};`);
}
await writeFile(new URL('stability.mjs', directory), compile(stability));
let engine = await readFile(new URL('../src/lib/engine.ts', import.meta.url), 'utf8');
engine = engine.replace("from './stability'", "from './stability.mjs'")
  .replace('LOADED_PING_INTERVAL = 400', 'LOADED_PING_INTERVAL = 5')
  .replace('LOADED_PING_GRACE = 1500', 'LOADED_PING_GRACE = 5')
  .replace('SETTLE_TICKS = 6', 'SETTLE_TICKS = 1');
await writeFile(new URL('engine.mjs', directory), compile(engine));
const { runSpeedtest } = await import(new URL('engine.mjs', directory));
const target = { name: 'Cloudflare', countries: [], ping: 'https://yanyubaby.eu.org/api/ping', download: ['https://yanyubaby.eu.org/api/download'], upload: ['https://yanyubaby.eu.org/api/upload'] };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run(mode, downloadStatus = 200, pingStatus = 204) {
  const originalFetch = globalThis.fetch;
  const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { value: { origin: 'https://yanyubaby.eu.org' }, configurable: true });
  let activeDownloads = 0, peakDownloads = 0, activeUploads = 0, peakUploads = 0;
  const phases = [];
  globalThis.fetch = async (url, init) => {
    init.signal?.throwIfAborted();
    if (init.method === 'HEAD') return new Response(null, { status: pingStatus });
    if (init.method === 'POST') {
      peakUploads = Math.max(peakUploads, ++activeUploads);
      await wait(5);
      activeUploads--;
      return new Response('{}');
    }
    if (downloadStatus !== 200) return new Response('error page', { status: downloadStatus });
    peakDownloads = Math.max(peakDownloads, ++activeDownloads);
    let count = 0, ended = false;
    const finish = () => { if (!ended) { ended = true; activeDownloads--; } };
    return new Response(new ReadableStream({
      async pull(controller) {
        await wait(2);
        if (init.signal.aborted || count++ === 4) { finish(); controller.close(); }
        else controller.enqueue(new Uint8Array(65536));
      },
      cancel: finish
    }), { headers: { 'Content-Length': String(4 * 65536) } });
  };
  try {
    await runSpeedtest(mode, target, AbortSignal.timeout(2000), {
      phase: (phase) => phases.push(phase), latency() {}, jitter() {}, download() {}, upload() {}
    });
    return { peakDownloads, peakUploads, phases };
  } finally {
    globalThis.fetch = originalFetch;
    if (originalLocation) Object.defineProperty(globalThis, 'location', originalLocation);
    else delete globalThis.location;
  }
}

test('single mode never overlaps download or upload requests and completes both phases', async () => {
  const result = await run('single');
  assert.equal(result.peakDownloads, 1);
  assert.equal(result.peakUploads, 1);
  assert.deepEqual(result.phases, ['download', 'upload', 'done']);
});

test('multi mode retains parallel downloads and uploads', async () => {
  const result = await run('multi');
  assert.ok(result.peakDownloads >= 3);
  assert.equal(result.peakUploads, 3);
});

test('HTTP error pages cannot become a successful speed result', async () => {
  await assert.rejects(run('single', 503), /未传输有效数据/);
  await assert.rejects(run('single', 200, 503), /Ping rejected: 503/);
});
