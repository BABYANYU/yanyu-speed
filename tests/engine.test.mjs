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
  .replace('SETTLE_TICKS = 6', 'SETTLE_TICKS = 1')
  .replace('DOWNLOAD_IDLE_TIMEOUT = 5000', 'DOWNLOAD_IDLE_TIMEOUT = 100')
  .replace('EMPTY_RESPONSE_BACKOFF = 300', 'EMPTY_RESPONSE_BACKOFF = 10')
  .replace('HELD_RATE_TTL = 2000', 'HELD_RATE_TTL = 20')
  // Test POST bodies need not allocate 32 MiB on every accelerated acknowledgement.
  .replace('UPLOAD_MAX_BYTES = 32 * 1024 * 1024', 'UPLOAD_MAX_BYTES = 256 * 1024');
await writeFile(new URL('engine.mjs', directory), compile(engine + '\nexport { pump, push, measure };'));
const { runSpeedtest, pump, push, measure } = await import(new URL('engine.mjs', directory));
const target = { name: 'Cloudflare', countries: [], ping: 'https://speed.fakeyou.eu.org/api/ping', download: ['https://speed.fakeyou.eu.org/api/download'], upload: ['https://speed.fakeyou.eu.org/api/upload'] };
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run(mode, downloadStatus = 200, pingStatus = 204) {
  const originalFetch = globalThis.fetch;
  const originalLocation = Object.getOwnPropertyDescriptor(globalThis, 'location');
  Object.defineProperty(globalThis, 'location', { value: { origin: 'https://speed.fakeyou.eu.org' }, configurable: true });
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

const endpoint = 'https://test.example/transfer';
const noopMeter = { flow() {}, transfer() {} };
async function withFetch(fetcher, task) {
  const original = globalThis.fetch;
  globalThis.fetch = fetcher;
  let timer;
  try {
    return await Promise.race([task(), new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Regression test exceeded its deadline')), 5000);
    })]);
  } finally {
    clearTimeout(timer);
    globalThis.fetch = original;
  }
}

function pendingUntilAbort(signal, onAbort = () => {}) {
  return new Promise((resolve, reject) => {
    const abort = () => { onAbort(); reject(signal.reason); };
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

test('failed current download cancels its prefetched body', async () => {
  const controller = new AbortController();
  let calls = 0, cancelled = 0, prefetchedSignal;
  await withFetch(async (url, init) => {
    init.signal.throwIfAborted();
    calls++;
    if (calls === 1) {
      let reads = 0;
      return new Response(new ReadableStream({
        pull(stream) {
          if (reads++ === 0) stream.enqueue(new Uint8Array(50));
          else stream.error(new Error('body disconnected'));
        }
      }), { headers: { 'Content-Length': '100' } });
    }
    prefetchedSignal = init.signal;
    return new Response(new ReadableStream({ cancel() { cancelled++; controller.abort(); } }));
  }, () => pump(endpoint, controller.signal, noopMeter, true));
  assert.equal(calls, 2);
  assert.equal(cancelled, 1);
  assert.equal(prefetchedSignal.aborted, true);
});

test('aborting a download also cancels an already resolved prefetch', async () => {
  const controller = new AbortController();
  let calls = 0, cancelled = 0;
  await withFetch(async (url, init) => {
    calls++;
    if (calls === 1) {
      let first = true;
      return new Response(new ReadableStream({
        start(stream) {
          init.signal.addEventListener('abort', () => stream.error(init.signal.reason), { once: true });
        },
        pull(stream) { if (first) { first = false; stream.enqueue(new Uint8Array(50)); } }
      }), { headers: { 'Content-Length': '100' } });
    }
    queueMicrotask(() => controller.abort());
    return new Response(new ReadableStream({ cancel() { cancelled++; } }));
  }, () => pump(endpoint, controller.signal, noopMeter, true));
  assert.equal(calls, 2);
  assert.equal(cancelled, 1);
});

test('empty 200 and 204 responses are backed off and fail after three attempts', async () => {
  for (const status of [200, 204]) {
    const times = [];
    await withFetch(async () => {
      times.push(performance.now());
      return new Response(null, { status });
    }, () => assert.rejects(pump(endpoint, new AbortController().signal, noopMeter, false), /空响应/));
    assert.equal(times.length, 3);
    assert.ok(times[1] - times[0] >= 8);
    assert.ok(times[2] - times[1] >= 8);
  }
});

test('empty-download failure reaches the caller and never reports done', async () => {
  const phases = [];
  await withFetch(async (url, init) => new Response(null, { status: init.method === 'HEAD' ? 204 : 200 }), async () => {
    await assert.rejects(runSpeedtest('single', { ...target, ping: endpoint, download: [endpoint], upload: [] }, new AbortController().signal, {
      phase: phase => phases.push(phase), latency() {}, jitter() {}, download() {}, upload() {}
    }), /空响应/);
  });
  assert.deepEqual(phases, ['download']);
});

test('download headers have an independent idle deadline', async () => {
  const controller = new AbortController();
  let requestSignal;
  await withFetch(async (url, init) => {
    requestSignal = init.signal;
    return pendingUntilAbort(init.signal, () => controller.abort());
  }, () => pump(endpoint, controller.signal, noopMeter, false));
  assert.equal(requestSignal.aborted, true);
  assert.equal(requestSignal.reason.name, 'TimeoutError');
});

test('slow download progress survives multiple idle-timeout periods without a restart', async () => {
  const controller = new AbortController();
  let calls = 0, bytes = 0, elapsed = 0;
  await withFetch(async (url, init) => {
    calls++;
    const started = performance.now();
    return new Response(new ReadableStream({
      start(stream) {
        init.signal.addEventListener('abort', () => stream.error(init.signal.reason), { once: true });
      },
      async pull(stream) {
        await wait(25);
        if (!init.signal.aborted) {
          elapsed = performance.now() - started;
          stream.enqueue(new Uint8Array(1024));
        }
      }
    }));
  }, () => pump(endpoint, controller.signal, {
    flow(count) { bytes += count; if (elapsed >= 300) controller.abort(); }, transfer() {}
  }, false));
  assert.equal(calls, 1);
  assert.ok(bytes >= 3 * 1024);
  assert.ok(elapsed >= 300);
});

test('slow upload is acknowledged beyond the former fixed request deadline', async () => {
  const controller = new AbortController();
  const updates = [];
  let calls = 0;
  await withFetch(async (url, init) => {
    calls++;
    await wait(250);
    init.signal.throwIfAborted();
    return new Response('{}');
  }, () => push(endpoint, controller.signal, {
    flow() {}, transfer(bytes, seconds) { updates.push({ bytes, seconds }); controller.abort(); }
  }));
  assert.equal(calls, 1);
  assert.equal(updates[0].bytes, 256 * 1024);
  assert.ok(updates[0].seconds >= 0.2);
});

test('an upload with no progress is still aborted by the phase cap', async () => {
  let uploadSignal, calls = 0;
  await withFetch(async (url, init) => {
    if (init.method === 'HEAD') return new Response(null, { status: 204 });
    calls++;
    uploadSignal = init.signal;
    return pendingUntilAbort(init.signal);
  }, () => assert.rejects(measure([(signal, meter) => push(endpoint, signal, meter)], endpoint,
    new AbortController().signal, () => {}), /未传输有效数据/));
  assert.equal(calls, 1);
  assert.equal(uploadSignal.aborted, true);
});

test('download deadline also interrupts a stalled response body', async () => {
  const controller = new AbortController();
  let signal;
  await withFetch(async (url, init) => {
    signal = init.signal;
    return new Response(new ReadableStream({
      start(stream) {
        init.signal.addEventListener('abort', () => {
          stream.error(init.signal.reason);
          controller.abort();
        }, { once: true });
      }
    }));
  }, () => pump(endpoint, controller.signal, noopMeter, false));
  assert.equal(signal.reason.name, 'TimeoutError');
});

test('a hung POST cannot hold the preceding successful upload rate indefinitely', async () => {
  let posts = 0, latest;
  await withFetch(async (url, init) => {
    if (init.method === 'HEAD') return new Response(null, { status: 204 });
    if (++posts === 1) { await wait(5); return new Response('{}'); }
    return pendingUntilAbort(init.signal);
  }, async () => {
    const result = await measure([(signal, meter) => push(endpoint, signal, meter)], endpoint, new AbortController().signal, value => { latest = value; });
    await result.settled;
  });
  assert.ok(posts >= 2);
  assert.equal(latest.bytes, 256 * 1024);
  assert.equal(latest.speed, 0);
  assert.equal(latest.sustained, 0);
});

test('an acknowledged rate expires even without a later transfer callback', async () => {
  let latest, transfers = 0;
  await withFetch(async () => new Response(null, { status: 204 }), async () => {
    const result = await measure([async (signal, meter) => {
      transfers++;
      meter.transfer(256 * 1024, 0.01);
      await pendingUntilAbort(signal).catch(() => {});
    }], endpoint, new AbortController().signal, value => { latest = value; });
    await result.settled;
  });
  assert.equal(transfers, 1);
  assert.equal(latest.bytes, 256 * 1024);
  assert.equal(latest.speed, 0);
});

test('failed POST still clears the preceding successful rate immediately', async () => {
  const controller = new AbortController();
  const updates = [];
  let calls = 0;
  await withFetch(async () => {
    await wait(2);
    return new Response('{}', { status: ++calls === 1 ? 200 : 503 });
  }, () => push(endpoint, controller.signal, {
    flow() {}, transfer(bytes) { updates.push(bytes); if (bytes === 0) controller.abort(); }
  }));
  assert.deepEqual(updates, [256 * 1024, 0]);
});
