import assert from 'node:assert/strict';

process.env.JUDGE0_API_URL = 'https://judge0-primary.test/submissions?wait=true';
process.env.JUDGE0_API_URL_2 = 'https://judge0-secondary.test/submissions?wait=true';
process.env.PISTON_API_URL = 'https://piston.test/api/v2/piston';

const savedKeys = [process.env.FREEMODEL_API_KEY, process.env.FREEMODEL_API_KEY_2, process.env.FREEMODEL_API_KEY_3];
delete process.env.FREEMODEL_API_KEY;
delete process.env.FREEMODEL_API_KEY_2;
delete process.env.FREEMODEL_API_KEY_3;

async function run() {
  const { executeCode } = await import('../lib/piston');
  const originalFetch = globalThis.fetch;

  try {
  let calls = 0;
  globalThis.fetch = async (input) => {
    calls += 1;
    const url = String(input);
    if (url.includes('piston.test')) {
      return new Response(JSON.stringify({
        compile: { code: 0, stderr: '' },
        run: { code: 0, stdout: '12\n', stderr: '' },
      }), { status: 200 });
    }
    return new Response('provider unavailable', { status: 503 });
  };

  const recovered = await executeCode('python', 'print(12)', '');
  assert.equal(recovered.verdict, 'Accepted');
  assert.equal(recovered.stdout, '12');
  assert.equal(calls, 3, 'primary, secondary, then Piston should be attempted');
  console.log('1. PASS: primary and secondary failures fail over to Piston');

  calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    return new Response('provider unavailable', { status: 503 });
  };

  const exhausted = await executeCode('python', 'print(12)', '');
  assert.equal(exhausted.verdict, 'Runtime Error');
  assert.match(exhausted.stderr, /temporarily busy/i);
  assert.equal(calls, 3, 'all configured sandbox providers should be attempted');
  console.log('2. PASS: exhausted providers return the existing safe execution contract');

  process.env.FREEMODEL_API_KEY = 'test-fallback-key';
  calls = 0;
  globalThis.fetch = async (input) => {
    calls += 1;
    const url = String(input);
    if (url.includes('api.freemodel.dev')) {
      return new Response(JSON.stringify({
        choices: [{ message: { content: JSON.stringify({ verdict: 'Accepted', stdout: '12', stderr: '', executionTime: 0, memory: 0 }) } }],
      }), { status: 200 });
    }
    return new Response('provider unavailable', { status: 503 });
  };

  const modelRecovered = await executeCode('python', 'print(12)', '');
  assert.equal(modelRecovered.verdict, 'Accepted');
  assert.equal(modelRecovered.stdout, '12');
  assert.equal(calls, 4, 'the fallback evaluator should run only after all sandbox providers fail');
  delete process.env.FREEMODEL_API_KEY;
  console.log('3. PASS: configured AI fallback preserves the execution response contract');

  console.log('Execution failover verification: 3 steps passed.');
  } finally {
    globalThis.fetch = originalFetch;
    [process.env.FREEMODEL_API_KEY, process.env.FREEMODEL_API_KEY_2, process.env.FREEMODEL_API_KEY_3] = savedKeys;
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
