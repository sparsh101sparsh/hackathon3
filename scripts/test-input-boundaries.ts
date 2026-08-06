import { NextRequest } from 'next/server';
import { POST as hintsHandler } from '../app/api/ai/hints/route';
import { POST as mockInterviewHandler } from '../app/api/ai/mock-interview/route';

async function run() {
  const oversizedRequest = new NextRequest('http://localhost:3000/api/ai/hints', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      problemTitle: 'A'.repeat(301),
      userCode: 'pass',
      hintLevel: 1,
    }),
  });

  const response = await hintsHandler(oversizedRequest);
  if (response.status !== 413) {
    throw new Error(`Expected oversized hints request to return 413, got ${response.status}`);
  }

  const malformedInterviewRequest = new NextRequest('http://localhost:3000/api/ai/mock-interview', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ action: 'start', company: { name: 'Google' }, topic: 'Arrays & Hashing' }),
  });

  const malformedInterviewResponse = await mockInterviewHandler(malformedInterviewRequest);
  if (malformedInterviewResponse.status !== 400) {
    throw new Error(`Expected malformed interview company to return 400, got ${malformedInterviewResponse.status}`);
  }

  console.log('Input boundary verification: oversized hint and malformed interview payloads rejected before model lookup.');
}

run().catch((error) => {
  console.error('Input boundary verification failed:', error);
  process.exit(1);
});
