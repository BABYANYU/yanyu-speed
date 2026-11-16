import { useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { useResetResult, useRunSession, useSetDownload, useSetJitter, useSetLatency, useSetPhase, useSetRunTarget, useSetUpload } from '@/context/speedtest';
import { runSpeedtest } from '@/lib/engine';
import type { ThreadMode } from '@/lib/engine';
import { MIN_DURATION, SAMPLE_INTERVAL } from '@/lib/stability';
import type { Target } from '@/lib/targets';

export type { Phase, ThreadMode, Throughput } from '@/lib/engine';

/** Samples a phase has produced by the minimum duration; the trend chart fills by then and compresses after. */
export const TREND_SAMPLES = Math.round(MIN_DURATION / SAMPLE_INTERVAL);

/** Starts and stops runs, reporting their figures through the contexts; one caller owns the run. */
export function useSpeedtestControls(mode: ThreadMode, target: Target, targetIndex: number) {
  const setPhase = useSetPhase();
  const setLatency = useSetLatency();
  const setJitter = useSetJitter();
  const setDownload = useSetDownload();
  const setUpload = useSetUpload();
  const setRunTarget = useSetRunTarget();
  const session = useRunSession();
  const stop = useResetResult();

  useEffect(() => () => session.cancel(), [session]);

  const start = useCallback(() => {
    stop();
    const controller = session.begin();
    setRunTarget(targetIndex);
    setPhase('latency');
    const report = {
      phase: session.guard(controller, setPhase),
      latency: session.guard(controller, setLatency),
      jitter: session.guard(controller, setJitter),
      download: session.guard(controller, setDownload),
      upload: session.guard(controller, setUpload)
    };
    void runSpeedtest(mode, target, controller.signal, report).catch(() => {
      if (session.isCurrent(controller)) {
        session.cancel();
        setPhase('error');
        toast.error('测速失败，请检查网络后重试。');
      }
    }).finally(() => session.finish(controller));
  }, [mode, target, targetIndex, stop, session, setRunTarget, setPhase, setLatency, setJitter, setDownload, setUpload]);

  return { start, stop };
}
