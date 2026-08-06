import { NextRequest } from 'next/server';
import { GET as profileHandler } from '../app/api/leaderboard/[id]/route';
import { prisma } from '../lib/prisma';

async function main() {
  const users = await prisma.user.findMany({ select: { id: true }, take: 2, orderBy: { createdAt: 'asc' } });
  if (users.length < 2) throw new Error('Comparison test requires at least two registered users.');

  const originalFetch = globalThis.fetch;
  const originalPrimary = process.env.PRIMARY_AI_API_KEY;
  const originalPrimary2 = process.env.PRIMARY_AI_API_KEY_2;
  const originalFree = process.env.FREEMODEL_API_KEY;
  const originalFree2 = process.env.FREEMODEL_API_KEY_2;
  try {
    process.env.PRIMARY_AI_API_KEY = 'comparison-test-key';
    process.env.PRIMARY_AI_API_KEY_2 = '';
    process.env.FREEMODEL_API_KEY = '';
    process.env.FREEMODEL_API_KEY_2 = '';
    globalThis.fetch = (async () => Response.json({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        summary: 'The profiles show different practice patterns.',
        advantages: ['Higher accepted volume'],
        focusAreas: ['Increase hard-problem exposure'],
        recommendation: 'Track the next two weeks of accepted submissions.',
      }) }] } }],
    })) as typeof fetch;

    const response = await profileHandler(
      new NextRequest(`http://localhost:3000/api/leaderboard/${users[0].id}?compare=${users[1].id}`),
      { params: Promise.resolve({ id: users[0].id }) },
    );
    const data = await response.json();
    if (response.status !== 200 || !data.compare || !data.comparison?.summary || !Array.isArray(data.comparison.focusAreas)) {
      throw new Error('Profile comparison response is incomplete.');
    }
    console.log('Leaderboard comparison verification passed: metrics and AI readout returned.');
  } finally {
    globalThis.fetch = originalFetch;
    process.env.PRIMARY_AI_API_KEY = originalPrimary;
    process.env.PRIMARY_AI_API_KEY_2 = originalPrimary2;
    process.env.FREEMODEL_API_KEY = originalFree;
    process.env.FREEMODEL_API_KEY_2 = originalFree2;
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
