export interface LinkedAbortController {
  signal: AbortSignal;
  cleanup: () => void;
  timedOut: () => boolean;
}

/**
 * Links an optional caller signal to a local timeout so both initial and
 * manually-triggered requests share the same cancellation behavior.
 */
export function createLinkedAbortController(
  parentSignal?: AbortSignal,
  timeoutMs?: number,
): LinkedAbortController {
  const controller = new AbortController();
  let didTimeout = false;
  const abortFromParent = () => controller.abort(parentSignal?.reason);

  if (parentSignal) {
    if (parentSignal.aborted) {
      controller.abort(parentSignal.reason);
    } else {
      parentSignal.addEventListener('abort', abortFromParent, { once: true });
    }
  }

  const timeoutId = timeoutMs === undefined
    ? undefined
    : setTimeout(() => {
      didTimeout = true;
      controller.abort(new DOMException('Request timed out', 'TimeoutError'));
    }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      parentSignal?.removeEventListener('abort', abortFromParent);
    },
    timedOut: () => didTimeout,
  };
}
