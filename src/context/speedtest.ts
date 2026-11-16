'use client';

import { createContext, createElement as ReactCreateElement, use, useCallback } from 'react';
import { createContextState } from 'foxact/context-state';
import { useSingleton } from 'foxact/use-singleton';
import { nullthrow } from 'foxact/nullthrow';
import { createRunSession } from '@/lib/run-session';
import type { RunSession } from '@/lib/run-session';
import { isRunningPhase } from '@/lib/speedtest-ui';
import { NOT_STARTED } from '@/lib/engine';
import type { Phase, ThreadMode, Throughput } from '@/lib/engine';

// Destructured bindings are re-exported by name below: Next only turns plain named exports of a
// client module into client references, so `export const [A, B] = …` reaches a server component as undefined.

// Live readings and results of the current run; written by the start button, read by every value.
// One context per figure, so a tick re-renders only the values it changed. The figures are read
// with `use(…Context)`, which may sit in a branch, so a value picks its source from a prop.
const [PhaseProvider, usePhase, useSetPhase] = createContextState<Phase>('idle');
/** Idle latency in ms: each ping while the latency phase runs, then the median. */
const [LatencyProvider, , useSetLatency, LatencyContext] = createContextState<number | null>(null);
const [JitterProvider, , useSetJitter, JitterContext] = createContextState<number | null>(null);
const [DownloadProvider, , useSetDownload, DownloadContext] = createContextState<Throughput>(NOT_STARTED);
const [UploadProvider, , useSetUpload, UploadContext] = createContextState<Throughput>(NOT_STARTED);

export function useRunning() {
  const phase = usePhase();
  return isRunningPhase(phase);
}

const [ModeProvider, useMode, useSetMode] = createContextState<ThreadMode>('single');

/** Index of a region picked by hand; null follows the geo lookup. */
const [ChoiceProvider, useChoice, useSetChoice] = createContextState<number | null>(null);

/** Region of the current run/result; late geo responses cannot relabel it. */
const [RunTargetProvider, useRunTarget, useSetRunTarget] = createContextState<number | null>(null);

const RunSessionContext = createContext<RunSession | null>(null);

export function RunSessionProvider({ children }: React.PropsWithChildren) {
  const { current: session } = useSingleton(createRunSession);
  return ReactCreateElement(RunSessionContext.Provider, { value: session }, children);
}

export function useRunSession() {
  return nullthrow(use(RunSessionContext), 'RunSessionProvider is required');
}

/** Invalidate the old run synchronously before clearing its visible result. */
export function useResetResult() {
  const session = useRunSession();
  const setPhase = useSetPhase();
  const setLatency = useSetLatency();
  const setJitter = useSetJitter();
  const setDownload = useSetDownload();
  const setUpload = useSetUpload();
  const setRunTarget = useSetRunTarget();
  return useCallback(() => {
    session.cancel();
    setRunTarget(null);
    setPhase('idle');
    setLatency(null);
    setJitter(null);
    setDownload(NOT_STARTED);
    setUpload(NOT_STARTED);
  }, [session, setRunTarget, setPhase, setLatency, setJitter, setDownload, setUpload]);
}

/** Screenshot mode: personal details are masked and the location drops to the country. */
const [RedactedProvider, useRedacted, useSetRedacted] = createContextState(false);

const [CapturingProvider, useCapturing, useSetCapturing] = createContextState(false);

/** The block a screenshot captures. */
const [RootProvider, useRoot, useSetRoot] = createContextState<HTMLDivElement | null>(null);

export {
  PhaseProvider, usePhase, useSetPhase,
  LatencyProvider, useSetLatency, LatencyContext,
  JitterProvider, useSetJitter, JitterContext,
  DownloadProvider, useSetDownload, DownloadContext,
  UploadProvider, useSetUpload, UploadContext,
  ModeProvider, useMode, useSetMode,
  ChoiceProvider, useChoice, useSetChoice,
  RunTargetProvider, useRunTarget, useSetRunTarget,
  RedactedProvider, useRedacted, useSetRedacted,
  CapturingProvider, useCapturing, useSetCapturing,
  RootProvider, useRoot, useSetRoot
};
