import { hashPassword, verifyPassword, signToken, verifyToken } from '../lib/auth';
import { callFreeModelText, callFreeModelJSON } from '../lib/freemodel';
import { executeCode } from '../lib/piston';

async function runTests() {
  console.log('=== STRESS TEST 1: lib/auth.ts ===');
  let authPass = true;

  // 1a. Test signature length mismatch in verifyToken
  const dummyUser = { id: 'u123', email: 'test@example.com', name: 'Test User', role: 'user' };
  const validToken = signToken(dummyUser);
  console.log('Generated valid token:', validToken);

  const parts = validToken.split('.');
  const header = parts[0];
  const payload = parts[1];
  const signature = parts[2];

  // Truncate signature
  const shortSigToken = `${header}.${payload}.${signature.substring(0, 10)}`;
  try {
    const res = verifyToken(shortSigToken);
    console.log('[1a Short Sig Token]: result =', res);
    if (res !== null) {
      console.error('FAIL: Expected null for short signature token');
      authPass = false;
    } else {
      console.log('PASS: Short signature token correctly returned null without throwing RangeError');
    }
  } catch (err) {
    console.error('FAIL: Short signature token threw error:', err);
    authPass = false;
  }

  // Extend signature
  const longSigToken = `${header}.${payload}.${signature}ExtraLongSuffix123456789`;
  try {
    const res = verifyToken(longSigToken);
    console.log('[1a Long Sig Token]: result =', res);
    if (res !== null) {
      console.error('FAIL: Expected null for long signature token');
      authPass = false;
    } else {
      console.log('PASS: Long signature token correctly returned null without throwing RangeError');
    }
  } catch (err) {
    console.error('FAIL: Long signature token threw error:', err);
    authPass = false;
  }

  // Single character signature
  const singleCharSigToken = `${header}.${payload}.a`;
  try {
    const res = verifyToken(singleCharSigToken);
    console.log('[1a Single Char Sig Token]: result =', res);
    if (res !== null) {
      console.error('FAIL: Expected null for single char signature token');
      authPass = false;
    } else {
      console.log('PASS: Single char signature token correctly returned null');
    }
  } catch (err) {
    console.error('FAIL: Single char signature token threw error:', err);
    authPass = false;
  }

  // Empty signature
  const emptySigToken = `${header}.${payload}.`;
  try {
    const res = verifyToken(emptySigToken);
    console.log('[1a Empty Sig Token]: result =', res);
    if (res !== null) {
      console.error('FAIL: Expected null for empty signature token');
      authPass = false;
    } else {
      console.log('PASS: Empty signature token correctly returned null');
    }
  } catch (err) {
    console.error('FAIL: Empty signature token threw error:', err);
    authPass = false;
  }

  // 1b. Test verifyPassword with mismatched length and invalid hashes
  const validHash = hashPassword('SecretPass123!');
  console.log('Generated hash:', validHash);

  // Correct password verify
  if (!verifyPassword('SecretPass123!', validHash)) {
    console.error('FAIL: verifyPassword failed for valid password');
    authPass = false;
  } else {
    console.log('PASS: verifyPassword succeeded for valid password');
  }

  // Incorrect password verify
  if (verifyPassword('WrongPass', validHash)) {
    console.error('FAIL: verifyPassword returned true for wrong password');
    authPass = false;
  } else {
    console.log('PASS: verifyPassword returned false for wrong password');
  }

  // Corrupted hash length (too short hash part)
  const shortHashStr = 'pbkdf2-sha512$210000$abcd$1234';
  try {
    const res = verifyPassword('SecretPass123!', shortHashStr);
    if (res !== false) {
      console.error('FAIL: Expected false for short hash string');
      authPass = false;
    } else {
      console.log('PASS: verifyPassword returned false for short hash length mismatch without RangeError');
    }
  } catch (err) {
    console.error('FAIL: verifyPassword threw error on short hash:', err);
    authPass = false;
  }

  // Malformed stored hash
  try {
    const res = verifyPassword('SecretPass123!', 'invalid-hash-format');
    if (res !== false) {
      console.error('FAIL: Expected false for malformed hash');
      authPass = false;
    } else {
      console.log('PASS: verifyPassword returned false for malformed hash');
    }
  } catch (err) {
    console.error('FAIL: verifyPassword threw error on malformed hash:', err);
    authPass = false;
  }


  console.log('\n=== STRESS TEST 2: lib/freemodel.ts ===');
  let freemodelPass = true;

  // Global fetch mocking helper for freemodel testing
  const originalFetch = globalThis.fetch;

  // Test 2a: Missing API key WITHOUT fallback (should throw "FREEMODEL_API_KEY is not configured")
  try {
    await callFreeModelText({
      systemInstruction: 'sys',
      userInstruction: 'user',
    });
    console.error('FAIL: callFreeModelText did not throw error when API key was missing and no fallback was set');
    freemodelPass = false;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('FREEMODEL_API_KEY is not configured')) {
      console.log('PASS: callFreeModelText threw error when API key missing and no fallback set:', errMsg);
    } else {
      console.error('FAIL: Unexpected error message when API key missing:', errMsg);
      freemodelPass = false;
    }
  }

  // Test 2b: Missing API key WITH fallbackText
  try {
    const res = await callFreeModelText({
      systemInstruction: 'sys',
      userInstruction: 'user',
      fallbackText: 'Fallback Text Missing Key',
    });
    if (res === 'Fallback Text Missing Key') {
      console.log('PASS: callFreeModelText returned fallbackText when API key missing');
    } else {
      console.error('FAIL: Unexpected result when API key missing:', res);
      freemodelPass = false;
    }
  } catch (err) {
    console.error('FAIL: callFreeModelText threw despite fallbackText when key missing:', err);
    freemodelPass = false;
  }

  // Now dynamically import freemodel module after setting FREEMODEL_API_KEY
  process.env.FREEMODEL_API_KEY = 'test-dummy-key';
  // Use a fresh import URL query to bypass ES module cache if possible or test configured behavior
  const freemodelConfigured = await import(`../lib/freemodel.ts?t=${Date.now()}`);

  // Test 2c: Configured API Key with HTTP 500 response and fallbackText
  globalThis.fetch = async () => {
    return new Response('500 Internal Server Error Response from upstream', { status: 500, statusText: 'Internal Server Error' });
  };

  try {
    const res = await freemodelConfigured.callFreeModelText({
      systemInstruction: 'sys',
      userInstruction: 'user',
      fallbackText: 'Fallback on HTTP 500',
    });
    if (res === 'Fallback on HTTP 500') {
      console.log('PASS: callFreeModelText returned fallbackText on HTTP 500 response when API key configured');
    } else {
      console.error('FAIL: Unexpected result on HTTP 500 with fallback:', res);
      freemodelPass = false;
    }
  } catch (err) {
    console.error('FAIL: callFreeModelText threw on HTTP 500 despite fallbackText:', err);
    freemodelPass = false;
  }

  // Test 2d: Configured API Key with HTTP 500 response WITHOUT fallback (should throw status 500 error)
  try {
    await freemodelConfigured.callFreeModelText({
      systemInstruction: 'sys',
      userInstruction: 'user',
    });
    console.error('FAIL: callFreeModelText did not throw error on HTTP 500 when no fallback set');
    freemodelPass = false;
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('500') && errMsg.includes('500 Internal Server Error Response from upstream')) {
      console.log('PASS: callFreeModelText threw status 500 error with message details when no fallback set:', errMsg);
    } else {
      console.error('FAIL: Unexpected error message on HTTP 500:', errMsg);
      freemodelPass = false;
    }
  }

  // Test 2e: Network/Fetch rejection with fallbackJson provided
  globalThis.fetch = async () => {
    throw new TypeError('Failed to fetch (Network Error)');
  };

  try {
    const res = await freemodelConfigured.callFreeModelJSON({
      systemInstruction: 'sys',
      userInstruction: 'user',
      fallbackJson: { status: 'fallback_success' },
    });
    if ((res as any)?.status === 'fallback_success') {
      console.log('PASS: callFreeModelJSON gracefully returned fallbackJson on network failure');
    } else {
      console.error('FAIL: callFreeModelJSON returned wrong response:', res);
      freemodelPass = false;
    }
  } catch (err) {
    console.error('FAIL: callFreeModelJSON threw on network failure despite fallbackJson:', err);
    freemodelPass = false;
  }

  // Test 2f: Invalid JSON response from API with fallbackJson
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({
      choices: [{ message: { content: 'NOT VALID JSON {{{' } }]
    }), { status: 200 });
  };

  try {
    const res = await freemodelConfigured.callFreeModelJSON({
      systemInstruction: 'sys',
      userInstruction: 'user',
      fallbackJson: { error: 'invalid_json_fallback' },
    });
    if ((res as any)?.error === 'invalid_json_fallback') {
      console.log('PASS: callFreeModelJSON returned fallbackJson when API response was non-parseable JSON');
    } else {
      console.error('FAIL: callFreeModelJSON failed on bad JSON:', res);
      freemodelPass = false;
    }
  } catch (err) {
    console.error('FAIL: callFreeModelJSON threw on parse error despite fallbackJson:', err);
    freemodelPass = false;
  }

  // Restore fetch
  globalThis.fetch = originalFetch;


  console.log('\n=== STRESS TEST 3: lib/piston.ts ===');
  let pistonPass = true;

  // Test 3a: HTTP Error Response from Judge0 (e.g. 503 Service Unavailable)
  globalThis.fetch = async () => {
    return new Response('Service Unavailable', { status: 503, statusText: 'Service Unavailable' });
  };

  try {
    const res = await executeCode('python', 'print("hello")', '');
    if (res.status === 'error' && res.verdict === 'Runtime Error' && res.stderr.includes('Code execution service is temporarily busy')) {
      console.log('PASS: executeCode returned graceful fallback PistonResult on Judge0 503 error');
    } else {
      console.error('FAIL: executeCode returned unexpected result on HTTP 503:', res);
      pistonPass = false;
    }
  } catch (err) {
    console.error('FAIL: executeCode threw uncaught exception on HTTP 503:', err);
    pistonPass = false;
  }

  // Test 3b: Network Error / Exception during fetch
  globalThis.fetch = async () => {
    throw new Error('Connection refused / ECONNREFUSED');
  };

  try {
    const res = await executeCode('cpp', '#include <iostream>', '');
    if (res.status === 'error' && res.verdict === 'Runtime Error' && res.stderr.includes('Code execution service is temporarily busy')) {
      console.log('PASS: executeCode returned graceful fallback PistonResult on network rejection');
    } else {
      console.error('FAIL: executeCode returned unexpected result on network error:', res);
      pistonPass = false;
    }
  } catch (err) {
    console.error('FAIL: executeCode threw uncaught exception on network error:', err);
    pistonPass = false;
  }

  // Test 3c: Judge0 response statuses parsing (e.g., statusId 6 Compilation Error, 5 TLE, 4 Wrong Answer, 3 Accepted)
  globalThis.fetch = async (url, options) => {
    const bodyStr = options?.body ? String(options.body) : '';
    const bodyObj = JSON.parse(bodyStr);
    
    if (bodyObj.source_code.includes('COMPILE_ERR')) {
      return new Response(JSON.stringify({
        status: { id: 6, description: 'Compilation Error' },
        compile_output: 'error: syntax error at line 5',
        time: '0.00',
        memory: 0
      }), { status: 200 });
    }
    
    if (bodyObj.source_code.includes('TLE')) {
      return new Response(JSON.stringify({
        status: { id: 5, description: 'Time Limit Exceeded' },
        stderr: 'Time Limit Exceeded',
        time: '4.01',
        memory: 12000
      }), { status: 200 });
    }

    return new Response(JSON.stringify({
      status: { id: 3, description: 'Accepted' },
      stdout: 'Success output\n',
      time: '0.05',
      memory: 15360
    }), { status: 200 });
  };

  try {
    const compErrRes = await executeCode('cpp', 'int main() { COMPILE_ERR }');
    if (compErrRes.status === 'error' && compErrRes.verdict === 'Compilation Error' && compErrRes.stderr.includes('syntax error')) {
      console.log('PASS: executeCode correctly parsed Compilation Error response');
    } else {
      console.error('FAIL: Compilation Error parsing failed:', compErrRes);
      pistonPass = false;
    }

    const tleRes = await executeCode('python', 'while True: pass # TLE');
    if (tleRes.status === 'error' && tleRes.verdict === 'TLE') {
      console.log('PASS: executeCode correctly parsed Time Limit Exceeded response');
    } else {
      console.error('FAIL: TLE parsing failed:', tleRes);
      pistonPass = false;
    }

    const okRes = await executeCode('python', 'print("ok")');
    if (okRes.status === 'success' && okRes.verdict === 'Accepted' && okRes.stdout === 'Success output') {
      console.log('PASS: executeCode correctly parsed Accepted response');
    } else {
      console.error('FAIL: Accepted parsing failed:', okRes);
      pistonPass = false;
    }
  } catch (err) {
    console.error('FAIL: Judge0 status parsing test threw error:', err);
    pistonPass = false;
  }

  // Restore fetch
  globalThis.fetch = originalFetch;

  console.log('\n=== EMPIRICAL SUMMARY ===');
  console.log(`lib/auth.ts: ${authPass ? 'PASS' : 'FAIL'}`);
  console.log(`lib/freemodel.ts: ${freemodelPass ? 'PASS' : 'FAIL'}`);
  console.log(`lib/piston.ts: ${pistonPass ? 'PASS' : 'FAIL'}`);

  if (!authPass || !freemodelPass || !pistonPass) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Unhandled test script error:', err);
  process.exit(1);
});
