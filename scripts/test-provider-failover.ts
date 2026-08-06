import { callFreeModelText } from '../lib/freemodel';

const originalEnv = {
  free1: process.env.FREEMODEL_API_KEY,
  free2: process.env.FREEMODEL_API_KEY_2,
  free3: process.env.FREEMODEL_API_KEY_3,
  primary1: process.env.PRIMARY_AI_API_KEY,
  primary2: process.env.PRIMARY_AI_API_KEY_2,
};
const originalFetch = globalThis.fetch;
const requests: string[] = [];

async function main() {
  try {
    process.env.FREEMODEL_API_KEY = 'free-primary-test';
    process.env.FREEMODEL_API_KEY_2 = 'free-secondary-test';
    process.env.FREEMODEL_API_KEY_3 = '';
    process.env.PRIMARY_AI_API_KEY = 'primary-ai-test-1';
    process.env.PRIMARY_AI_API_KEY_2 = 'primary-ai-test-2';

    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      requests.push(url);
      if (url.includes('generativelanguage.googleapis.com')) {
        return Response.json({ candidates: [{ content: { parts: [{ text: 'primary-ai-success' }] } }] });
      }
      return new Response('unexpected FreeModel call', { status: 500 });
    }) as typeof fetch;

    let reply = await callFreeModelText({
      messages: [{ role: 'user', content: 'test fallback' }],
      timeoutMs: 5_000,
    });

    if (reply !== 'primary-ai-success' || requests.length !== 1 || !requests[0].includes('key=primary-ai-test-1')) {
      throw new Error(`Primary AI should be primary, got ${reply} after ${requests.join(', ')}`);
    }

    requests.length = 0;
    globalThis.fetch = (async (input: RequestInfo | URL) => {
      const url = String(input);
      requests.push(url);
      if (url.includes('generativelanguage.googleapis.com')) return new Response('Primary AI unavailable', { status: 503 });
      return Response.json({ choices: [{ message: { content: 'freemodel-secondary-success' } }] });
    }) as typeof fetch;

    reply = await callFreeModelText({ messages: [{ role: 'user', content: 'test fallback' }], timeoutMs: 5_000 });
    if (reply !== 'freemodel-secondary-success' || requests.length !== 3 || !requests[0].includes('key=primary-ai-test-1') || !requests[1].includes('key=primary-ai-test-2') || !requests[2].includes('freemodel.dev')) {
      throw new Error(`FreeModel fallback order was incorrect: ${reply} after ${requests.join(', ')}`);
    }
    console.log('Provider order verification passed: Primary AI -> FreeModel fallback.');
  } finally {
    globalThis.fetch = originalFetch;
    process.env.FREEMODEL_API_KEY = originalEnv.free1;
    process.env.FREEMODEL_API_KEY_2 = originalEnv.free2;
    process.env.FREEMODEL_API_KEY_3 = originalEnv.free3;
    process.env.PRIMARY_AI_API_KEY = originalEnv.primary1;
    process.env.PRIMARY_AI_API_KEY_2 = originalEnv.primary2;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
