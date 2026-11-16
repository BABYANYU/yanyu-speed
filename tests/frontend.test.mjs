import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

// Compile the actual pure frontend modules in memory; no source-string assertions.
async function loadModule(path) {
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 }
  });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const { createRunSession } = await loadModule('../src/lib/run-session.ts');
const { parseGeo } = await loadModule('../src/lib/geo.ts');
const { startDisabled, isRunningPhase, effectiveRedaction, targetIndex } = await loadModule('../src/lib/speedtest-ui.ts');

test('stop invalidates callbacks before synchronous abort handlers and delayed reports', async () => {
  const session = createRunSession();
  const run = session.begin();
  const reports = [];
  const report = session.guard(run, (value) => reports.push(value));
  report('before stop');
  run.signal.addEventListener('abort', () => report('abort handler'));
  const delayed = Promise.resolve().then(() => report('late progress'));
  session.cancel();
  await delayed;
  assert.equal(run.signal.aborted, true);
  assert.deepEqual(reports, ['before stop']);
});

test('restart rejects every old run report and old completion cannot invalidate the new run', () => {
  const session = createRunSession();
  const first = session.begin();
  const reports = [];
  const old = session.guard(first, (value) => reports.push(value));
  const second = session.begin();
  old('done');
  session.finish(first);
  session.guard(second, (value) => reports.push(value))('new progress');
  assert.equal(first.signal.aborted, true);
  assert.equal(session.isCurrent(second), true);
  assert.deepEqual(reports, ['new progress']);
  session.finish(second);
  assert.equal(session.isCurrent(second), false);
});

test('configuration reset blocks deferred settled results as well as phase changes', () => {
  const session = createRunSession();
  const run = session.begin();
  let phase = 'done';
  let speed = 100;
  const updateSpeed = session.guard(run, (value) => { speed = value; });
  const updatePhase = session.guard(run, (value) => { phase = value; });
  session.cancel();
  phase = 'idle';
  speed = null;
  updateSpeed(101);
  updatePhase('done');
  assert.equal(phase, 'idle');
  assert.equal(speed, null);
});

test('geo retry cannot disable Stop and manual choice does not wait for geo', () => {
  for (const phase of ['latency', 'download', 'upload']) {
    assert.equal(isRunningPhase(phase), true);
    assert.equal(startDisabled(phase, false, true, 2, null), false);
  }
  for (const phase of ['idle', 'done', 'error']) {
    assert.equal(isRunningPhase(phase), false);
    assert.equal(startDisabled(phase, false, true, 2, null), true);
    assert.equal(startDisabled(phase, false, true, 2, 1), false);
    assert.equal(startDisabled(phase, true, false, 1, null), true);
  }
});

test('capture forces redaction without changing the user preference', () => {
  for (const preference of [false, true]) {
    assert.equal(effectiveRedaction(preference, true), true);
    assert.equal(effectiveRedaction(preference, false), preference);
  }
});

test('late geo cannot relabel an active/completed run; clearing the pin applies new choice', () => {
  const targets = [{ countries: ['US'] }, { countries: ['JP'] }];
  assert.equal(targetIndex(targets, null, undefined, null), 0);
  assert.equal(targetIndex(targets, null, 'JP', 0), 0);
  assert.equal(targetIndex(targets, 1, 'US', null), 1);
  assert.equal(targetIndex(targets, null, 'JP', null), 1);
  assert.equal(targetIndex(targets, 99, 'JP', 99), 1);
});

test('geo rejects malformed payloads before rendering and normalizes optional fields', () => {
  for (const input of [null, [], {}, 42, 'geo', { ip: 123, country_code: 'JP' }, { ip: '::1', country_code: null }, { ip: '::1', country_code: 'Japan' }, { ip: '::1', country_code: 'JP', city: {} }, { ip: '::1', country_code: 'JP', asn: '123' }]) {
    assert.throws(() => parseGeo(input), TypeError);
  }
  const geo = parseGeo({ ip: '::1', country_code: 'jp', city: null, latitude: null });
  assert.equal(geo.country_code, 'JP');
  assert.equal(geo.city, '');
  assert.equal(geo.isp, '');
  assert.equal(geo.latitude, null);
  assert.equal(geo.asn, null);
  assert.equal(parseGeo({ ip: '', country_code: '' }).country_code, '');
});

// Execute the real hook and reset hook with injected React/context adapters. The engine is
// deliberately non-cooperative so these tests exercise the frontend boundary, not fetch abort.
const compileCommonJS = async (path) => ts.transpileModule(await readFile(new URL(path, import.meta.url), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS }
}).outputText;
const controlsSource = await compileCommonJS('../src/hooks/use-speedtest.ts');
const contextSource = await compileCommonJS('../src/context/speedtest.ts');
const flush = () => new Promise((resolve) => setImmediate(resolve));
function hookHarness() {
  const session = createRunSession();
  const cleanups = [], runs = [], errors = [], states = [];
  const empty = { speed: null, sustained: null, latency: null, trend: [], bytes: 0 };
  const react = {
    createContext: () => ({}), createElement() {},
    use: () => session,
    useCallback: (callback) => callback,
    useEffect: (effect) => { cleanups.push(effect()); }
  };
  const context = { exports: {} };
  const dependencies = {
    react,
    'foxact/use-singleton': { useSingleton: (initializer) => ({ current: initializer() }) },
    'foxact/nullthrow': { nullthrow: (value, message) => {
      if (value === null || value === undefined) throw new Error(message);
      return value;
    } },
    'foxact/context-state': {
      createContextState(initial) {
        const state = { value: initial };
        states.push(state);
        return [() => null, () => state.value, () => (value) => { state.value = value; }, {}];
      }
    },
    '@/lib/run-session': { createRunSession },
    '@/lib/speedtest-ui': { isRunningPhase },
    '@/lib/engine': { NOT_STARTED: empty }
  };
  runInNewContext(contextSource, { exports: context.exports, require: (id) => {
    assert.ok(id in dependencies, `Unexpected dependency ${id}`);
    return dependencies[id];
  } });
  const state = {};
  // State creation order is incidental; access the real exported context hooks instead.
  const setters = ['Phase', 'Latency', 'Jitter', 'Download', 'Upload', 'RunTarget'];
  for (const name of setters) {
    const original = context.exports[`useSet${name}`];
    context.exports[`useSet${name}`] = () => (value) => { state[name] = value; original()(value); };
  }
  const hook = { exports: {} };
  const hookDependencies = {
    react,
    sonner: { toast: { error: (message) => errors.push(message) } },
    '@/context/speedtest': context.exports,
    '@/lib/stability': { MIN_DURATION: 7, SAMPLE_INTERVAL: 0.1 },
    '@/lib/engine': { runSpeedtest(mode, target, signal, report) {
      return new Promise((resolve, reject) => runs.push({ mode, target, signal, report, resolve, reject }));
    } }
  };
  runInNewContext(controlsSource, { exports: hook.exports, require: (id) => {
    assert.ok(id in hookDependencies, `Unexpected dependency ${id}`);
    return hookDependencies[id];
  } });
  const controls = hook.exports.useSpeedtestControls('single', { name: 'A' }, 0);
  return { controls, session, state, runs, errors, cleanups, context: context.exports, states };
}

test('actual controls report error, preserve partial data, and reject late callbacks', async () => {
  const harness = hookHarness();
  harness.controls.start();
  const run = harness.runs[0];
  run.report.download({ speed: 42 });
  run.reject(new Error('upload failed'));
  await flush();
  assert.equal(harness.state.Phase, 'error');
  assert.equal(harness.context.useRunning(), false);
  assert.equal(harness.state.Download.speed, 42);
  assert.equal(harness.errors.length, 1);
  assert.equal(run.signal.aborted, true);
  run.report.phase('done');
  assert.equal(harness.state.Phase, 'error');
});

test('actual controls stop/restart suppress stale progress and stale rejection', async () => {
  const harness = hookHarness();
  harness.controls.start();
  const old = harness.runs[0];
  harness.controls.stop();
  old.report.phase('done');
  assert.equal(harness.context.usePhase(), 'idle');
  harness.controls.start();
  const current = harness.runs[1];
  old.reject(new Error('late rejection'));
  await flush();
  old.report.latency(999);
  current.report.latency(12);
  assert.equal(harness.state.Latency, 12);
  assert.equal(harness.state.Phase, 'latency');
  assert.equal(harness.errors.length, 0);
  assert.equal(current.signal.aborted, false);
});

test('actual configuration reset clears readings and cancels deferred completion', () => {
  const harness = hookHarness();
  harness.controls.start();
  const run = harness.runs[0];
  run.report.phase('done');
  run.report.download({ speed: 100 });
  harness.context.useResetResult()();
  run.report.phase('done');
  run.report.download({ speed: 200 });
  assert.equal(harness.context.usePhase(), 'idle');
  assert.equal(harness.context.useRunTarget(), null);
  assert.equal(harness.states[3].value.speed, null);
  assert.equal(harness.states[4].value.speed, null);
  assert.equal(run.signal.aborted, true);
});

test('actual hook cleanup invalidates callbacks and prevents unmount errors', async () => {
  const harness = hookHarness();
  harness.controls.start();
  const run = harness.runs[0];
  for (const cleanup of harness.cleanups) cleanup?.();
  run.report.phase('done');
  run.reject(new Error('unmounted'));
  await flush();
  assert.equal(run.signal.aborted, true);
  assert.equal(harness.state.Phase, 'latency');
  assert.equal(harness.errors.length, 0);
});
