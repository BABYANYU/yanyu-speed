import { useChoice, useRunTarget } from '@/context/speedtest';
import { useGeo } from './use-geo';
import type { Target } from '@/lib/targets';
import { targetIndex } from '@/lib/speedtest-ui';

export function useTargetIndex(targets: readonly Target[]): number {
  const choice = useChoice();
  const { data: geo } = useGeo();
  const pinned = useRunTarget();
  return targetIndex(targets, choice, geo?.country_code, pinned);
}

export function useTarget(targets: readonly Target[]): Target {
  return targets[useTargetIndex(targets)];
}
