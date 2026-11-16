import type { Phase } from './engine';
import type { Target } from './targets';

export function isRunningPhase(phase: Phase): boolean {
  return phase === 'latency' || phase === 'download' || phase === 'upload';
}

export function startDisabled(phase: Phase, capturing: boolean, locating: boolean, targetCount: number, choice: number | null): boolean {
  // A location retry must never take away the stop control.
  if (isRunningPhase(phase)) return false;
  return capturing || (choice === null && targetCount > 1 && locating);
}

export function effectiveRedaction(redacted: boolean, capturing: boolean): boolean {
  return redacted || capturing;
}

export function targetIndex(targets: readonly Target[], choice: number | null, country: string | undefined, pinned: number | null): number {
  const valid = (index: number | null): index is number => index !== null && Number.isSafeInteger(index) && index >= 0 && index < targets.length;
  if (valid(pinned)) return pinned;
  if (valid(choice)) return choice;
  const detected = country === undefined ? -1 : targets.findIndex((target) => target.countries.includes(country));
  return detected < 0 ? 0 : detected;
}
