/** Owns one run; cancellation invalidates callbacks before abort handlers can fire. */
export function createRunSession() {
  let current: AbortController | null = null;
  const cancel = () => {
    const previous = current;
    current = null;
    previous?.abort();
  };
  const isCurrent = (run: AbortController) => current === run && !run.signal.aborted;
  return {
    cancel,
    begin() {
      cancel();
      current = new AbortController();
      return current;
    },
    isCurrent,
    finish(run: AbortController) {
      if (current === run) current = null;
    },
    guard<Args extends unknown[]>(run: AbortController, callback: (...args: Args) => void) {
      return (...args: Args) => {
        if (isCurrent(run)) callback(...args);
      };
    }
  };
}

export type RunSession = ReturnType<typeof createRunSession>;
