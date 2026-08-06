import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRatingTier } from '@/lib/rating';
import { callFreeModelJSON } from '@/lib/freemodel';
import { rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

type ProfileComparison = {
  summary: string;
  advantages: string[];
  focusAreas: string[];
  recommendation: string;
};

type LoadedProfile = NonNullable<Awaited<ReturnType<typeof loadProfile>>>;

function fallbackComparison(left: LoadedProfile, right: LoadedProfile): ProfileComparison {
  const advantages: string[] = [];
  const focusAreas: string[] = [];
  if (left.solved.total >= right.solved.total) advantages.push(`${left.name} has solved more problems overall.`);
  else focusAreas.push(`Increase solved volume to close the ${right.solved.total - left.solved.total}-problem gap.`);
  if (left.accuracy >= right.accuracy) advantages.push(`${left.name} has the stronger submission accuracy.`);
  else focusAreas.push(`Review failed submissions and edge cases to improve accuracy.`);
  if (left.streak >= right.streak) advantages.push(`${left.name} has the stronger active streak.`);
  else focusAreas.push(`Build a daily practice streak with one focused problem per day.`);
  const harder = left.solved.hard >= right.solved.hard ? left.name : right.name;
  return {
    summary: `${left.name} and ${right.name} show different strengths across volume, accuracy, consistency, and difficulty.` ,
    advantages: advantages.length ? advantages : [`${harder} currently leads on advanced problem exposure.`],
    focusAreas: focusAreas.length ? focusAreas : ['Keep difficulty progression steady while preserving accuracy.'],
    recommendation: 'Compare the next two weeks of accepted submissions, not only the current totals, and target the weaker difficulty band.',
  };
}

async function buildComparison(left: LoadedProfile, right: LoadedProfile) {
  const fallback = fallbackComparison(left, right);
  return callFreeModelJSON<ProfileComparison>({
    systemInstruction: 'You are a precise coding-coach analyst. Compare two public DSA profiles using only the supplied aggregate metrics. Return JSON with summary (string), advantages (string array), focusAreas (string array), and recommendation (string). Do not invent facts or mention private data.',
    userInstruction: JSON.stringify({
      left: { name: left.name, rating: left.rating, solved: left.solved, accuracy: left.accuracy, streak: left.streak, consistency: left.consistency },
      right: { name: right.name, rating: right.rating, solved: right.solved, accuracy: right.accuracy, streak: right.streak, consistency: right.consistency },
    }),
    temperature: 0.2,
    maxTokens: 700,
    timeoutMs: 15_000,
    fallbackJson: fallback,
  }).then((result) => ({
    summary: typeof result.summary === 'string' ? result.summary : fallback.summary,
    advantages: Array.isArray(result.advantages) ? result.advantages.map(String).slice(0, 4) : fallback.advantages,
    focusAreas: Array.isArray(result.focusAreas) ? result.focusAreas.map(String).slice(0, 4) : fallback.focusAreas,
    recommendation: typeof result.recommendation === 'string' ? result.recommendation : fallback.recommendation,
  }));
}

async function loadProfile(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, createdAt: true },
  });

  const [progress, submissions, totalSubmissionCount, acceptedSubmissionCount, accepted] = await prisma.$transaction([
    prisma.userProgress.findUnique({ where: { userId: id }, select: { streak: true, lastActiveDate: true } }),
    prisma.submission.findMany({
      where: { userId: id },
      select: { status: true, problemId: true, createdAt: true, problem: { select: { difficulty: true, title: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.submission.count({ where: { userId: id } }),
    prisma.submission.count({ where: { userId: id, status: 'Accepted' } }),
    prisma.submission.findMany({
      where: { userId: id, status: 'Accepted' },
      distinct: ['problemId'],
      select: { problemId: true, problem: { select: { difficulty: true } } },
    }),
  ]);

  const ratingHistory = await prisma.userRating.findMany({
    where: { userId: id },
    select: { rating: true, delta: true, timestamp: true },
    orderBy: { timestamp: 'desc' },
    take: 20,
  });

  const hasPublicActivity =
    Boolean(user) ||
    id === 'guest' ||
    Boolean(progress) ||
    totalSubmissionCount > 0 ||
    ratingHistory.length > 0;

  if (!hasPublicActivity) return null;

  const displayUser = user || {
    id,
    name: id === 'guest' ? 'Guest Coder' : `Coder (${id.slice(0, 6)})`,
    createdAt: new Date(0),
  };

  const accuracy = totalSubmissionCount ? Math.round((acceptedSubmissionCount / totalSubmissionCount) * 1000) / 10 : 0;
  const solved = { easy: 0, medium: 0, hard: 0, total: accepted.length };
  accepted.forEach(({ problem }) => {
    if (problem.difficulty === 'EASY') solved.easy += 1;
    if (problem.difficulty === 'MEDIUM') solved.medium += 1;
    if (problem.difficulty === 'HARD') solved.hard += 1;
  });

  const rating = ratingHistory[0]?.rating || 0;

  return {
    id: displayUser.id,
    name: displayUser.name,
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(displayUser.name)}`,
    joinedAt: (user?.createdAt || progress?.lastActiveDate || new Date()).toISOString().split('T')[0],
    rating,
    ratingTier: getRatingTier(rating),
    solved,
    accuracy,
    streak: progress?.streak || 0,
    lastActiveDate: progress?.lastActiveDate?.toISOString() || null,
    consistency: Math.min(100, Math.round((progress?.streak || 0) * 10 + Math.min(accepted.length, 40))),
    ratingHistory,
    recentSubmissions: submissions.slice(0, 10).map((item) => ({
      status: item.status,
      createdAt: item.createdAt,
      problem: item.problem,
    })),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const limitResponse = rateLimitResponse(request, 'public:profile-compare', 20, 60 * 1000);
    if (limitResponse) return limitResponse;
    const { id } = await params;
    if (!id || id.length > 64) return NextResponse.json({ error: 'Invalid profile id' }, { status: 400 });
    const profile = await loadProfile(id);
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const compareId = new URL(request.url).searchParams.get('compare');
    const compare = compareId && compareId !== id && compareId.length <= 64 ? await loadProfile(compareId) : null;
    const comparison = compare ? await buildComparison(profile, compare) : null;
    return NextResponse.json({ profile, compare, comparison });
  } catch (error: unknown) {
    console.error('Error fetching public profile:', error);
    return NextResponse.json({ error: 'Unable to load this profile right now.' }, { status: 500 });
  }
}
