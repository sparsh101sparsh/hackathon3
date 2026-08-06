import { createLinkedAbortController } from '../lib/abort';

type FetchCall = { authorization: string; timeoutSignal: AbortSignal };

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function expectAbort(signal: AbortSignal, timeoutMs: number): Promise<void> {
  if (signal.aborted) return;
  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timer = setTimeout(() => reject(new Error(`signal did not abort within ${timeoutMs + 100}ms`)), timeoutMs + 100);
    signal.addEventListener('abort', () => {
      clearTimeout(timer);
      resolve();
    }, { once: true });
  });
}

async function run() {
  console.log('=== PROVIDER RESILIENCE MULTI-STEP VERIFICATION ===');

  console.log('1. Linked timeout aborts a request without a caller-owned controller');
  const timeoutRequest = createLinkedAbortController(undefined, 20);
  await expectAbort(timeoutRequest.signal, 20);
  assert(timeoutRequest.signal.aborted, 'timeout signal should be aborted');
  timeoutRequest.cleanup();
  console.log('   PASS: timeout signal aborted and cleaned up');

  console.log('2. Parent cancellation propagates to the linked request');
  const parent = new AbortController();
  const linkedRequest = createLinkedAbortController(parent.signal, 500);
  parent.abort();
  await expectAbort(linkedRequest.signal, 20);
  assert(linkedRequest.signal.aborted, 'parent abort should propagate');
  linkedRequest.cleanup();
  console.log('   PASS: parent cancellation propagated');

  const originalFetch = globalThis.fetch;
  const originalKeys = [
    process.env.FREEMODEL_API_KEY,
    process.env.FREEMODEL_API_KEY_2,
    process.env.FREEMODEL_API_KEY_3,
  ];
  const originalPrimaryKeys = [process.env.PRIMARY_AI_API_KEY, process.env.PRIMARY_AI_API_KEY_2];

  process.env.FREEMODEL_API_KEY = 'primary-test-key';
  process.env.FREEMODEL_API_KEY_2 = 'secondary-test-key';
  process.env.FREEMODEL_API_KEY_3 = 'tertiary-test-key';
  process.env.PRIMARY_AI_API_KEY = '';
  process.env.PRIMARY_AI_API_KEY_2 = '';

  try {
    const freemodel = await import(`../lib/freemodel.ts?resilience=${Date.now()}`);

    console.log('3. Provider failover tries configured keys in order');
    const calls: FetchCall[] = [];
    globalThis.fetch = async (_input, init) => {
      calls.push({
        authorization: new Headers(init?.headers).get('Authorization') || '',
        timeoutSignal: init?.signal as AbortSignal,
      });
      if (calls.length === 1) throw new Error('primary unavailable');
      if (calls.length === 2) return new Response('secondary unavailable', { status: 503 });
      return new Response(JSON.stringify({ choices: [{ message: { content: 'tertiary success' } }] }), { status: 200 });
    };

    const failoverText = await freemodel.callFreeModelText({
      userInstruction: 'test',
      timeoutMs: 500,
    });
    assert(failoverText === 'tertiary success', 'failover should return the successful provider response');
    assert(calls.map((call) => call.authorization).join(',') === 'Bearer primary-test-key,Bearer secondary-test-key,Bearer tertiary-test-key', 'providers were not attempted in configured order');
    console.log('   PASS: primary -> secondary -> tertiary order preserved');

    console.log('4. Exhausted providers return the deterministic fallback');
    let exhaustedCalls = 0;
    globalThis.fetch = async () => {
      exhaustedCalls += 1;
      throw new Error('provider unavailable');
    };
    const fallbackText = await freemodel.callFreeModelText({
      userInstruction: 'test',
      timeoutMs: 500,
      fallbackText: 'deterministic fallback',
    });
    assert(fallbackText === 'deterministic fallback', 'text fallback should be returned after all providers fail');
    assert(exhaustedCalls === 3, `expected all 3 providers to be attempted, got ${exhaustedCalls}`);
    console.log('   PASS: all providers exhausted, fallback returned');

    console.log('5. Timeout applies to the entire provider chain');
    let timedOutCalls = 0;
    globalThis.fetch = async (_input, init) => {
      timedOutCalls += 1;
      await new Promise<void>((resolve, reject) => {
        const signal = init?.signal as AbortSignal;
        const keepProcessAlive = setTimeout(() => reject(new Error('mock provider did not abort')), 1000);
        if (signal.aborted) {
          clearTimeout(keepProcessAlive);
          return reject(signal.reason);
        }
        signal.addEventListener('abort', () => {
          clearTimeout(keepProcessAlive);
          reject(signal.reason);
        }, { once: true });
      });
      return new Response('unreachable', { status: 500 });
    };
    const startedAt = Date.now();
    const timeoutFallback = await freemodel.callFreeModelText({
      userInstruction: 'test',
      timeoutMs: 25,
      fallbackText: 'timeout fallback',
    });
    const elapsedMs = Date.now() - startedAt;
    assert(timeoutFallback === 'timeout fallback', 'timeout should reach fallback');
    assert(timedOutCalls === 1, `timeout should stop the chain after the deadline, got ${timedOutCalls} calls`);
    assert(elapsedMs < 250, `timeout exceeded the expected bound: ${elapsedMs}ms`);
    console.log(`   PASS: timeout bounded the whole chain (${elapsedMs}ms)`);

    console.log('6. Invalid provider JSON returns the typed JSON fallback');
    globalThis.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: 'not json' } }] }), { status: 200 });
    const fallbackJson = await freemodel.callFreeModelJSON({
      userInstruction: 'test',
      fallbackJson: { status: 'json fallback' },
      timeoutMs: 500,
    }) as { status: string };
    assert(fallbackJson.status === 'json fallback', 'invalid JSON should return fallbackJson');
    console.log('   PASS: invalid provider JSON returned fallbackJson');
  } finally {
    globalThis.fetch = originalFetch;
    [process.env.FREEMODEL_API_KEY, process.env.FREEMODEL_API_KEY_2, process.env.FREEMODEL_API_KEY_3] = originalKeys;
    [process.env.PRIMARY_AI_API_KEY, process.env.PRIMARY_AI_API_KEY_2] = originalPrimaryKeys;
  }

  console.log('Provider resilience verification: 6 steps passed.');
}

run().catch((error) => {
  console.error('Provider resilience verification failed:', error);
  process.exit(1);
});
