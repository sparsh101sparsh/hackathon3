import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRatingTier, RatingTier } from '@/lib/rating';
import { getTtlCached } from '@/lib/ttlCache';

export const dynamic = 'force-dynamic';

export interface LeaderboardUser {
  rank: number;
  id: string;
  name: string;
  avatar: string;
  rating: number;
  ratingTier: RatingTier;
  solved: {
    easy: number;
    medium: number;
    hard: number;
    total: number;
  };
  accuracy: number;
  consistency: number;
  country: string;
  joinedAt: string;
  streak: number;
}

export async function GET(req: NextRequest) {
  try {
    const [allProgress, submissionCounts, acceptedProblemGroups, allUserRatings, dbUsers] = await getTtlCached(
      'public:leaderboard:base:v2',
      30_000,
      () => prisma.$transaction([
        prisma.userProgress.findMany({
          select: { userId: true, lastActiveDate: true, streak: true },
        }),
        prisma.submission.groupBy({
          by: ['userId', 'status'],
          orderBy: [{ userId: 'asc' }, { status: 'asc' }],
          _count: { _all: true },
        }),
        prisma.submission.groupBy({
          by: ['userId', 'problemId'],
          where: { status: 'Accepted' },
          orderBy: [{ userId: 'asc' }, { problemId: 'asc' }],
        }),
        prisma.userRating.findMany({
          select: { userId: true, rating: true, timestamp: true },
          orderBy: { timestamp: 'desc' },
        }),
        prisma.user.findMany({
          select: { id: true, name: true, createdAt: true },
        }),
      ]),
    );

    const acceptedProblemIds = [...new Set(acceptedProblemGroups.map((group) => group.problemId))];
    const problemDifficulties = acceptedProblemIds.length > 0
      ? await prisma.problem.findMany({
        where: { id: { in: acceptedProblemIds } },
        select: { id: true, difficulty: true },
      })
      : [];
    const difficultyByProblemId = new Map(problemDifficulties.map((problem) => [problem.id, problem.difficulty]));

    const countsByUser = new Map<string, { total: number; accepted: number }>();
    submissionCounts.forEach((group) => {
      const uid = group.userId || 'guest';
      const counts = countsByUser.get(uid) || { total: 0, accepted: 0 };
      counts.total += group._count._all;
      if (group.status === 'Accepted') counts.accepted += group._count._all;
      countsByUser.set(uid, counts);
    });

    const solvedByUser = new Map<string, { easy: Set<string>; medium: Set<string>; hard: Set<string> }>();
    acceptedProblemGroups.forEach((group) => {
      const difficulty = difficultyByProblemId.get(group.problemId);
      if (!difficulty) return;
      const uid = group.userId || 'guest';
      const solved = solvedByUser.get(uid) || { easy: new Set<string>(), medium: new Set<string>(), hard: new Set<string>() };
      if (difficulty === 'EASY') solved.easy.add(group.problemId);
      else if (difficulty === 'MEDIUM') solved.medium.add(group.problemId);
      else if (difficulty === 'HARD') solved.hard.add(group.problemId);
      solvedByUser.set(uid, solved);
    });

    // Map latest rating per user
    const userRatingMap = new Map<string, number>();
    allUserRatings.forEach((ur) => {
      const uid = ur.userId || 'guest';
      if (!userRatingMap.has(uid)) {
        userRatingMap.set(uid, ur.rating);
      }
    });

    const userIds = new Set<string>([
      ...allProgress.map((p) => p.userId || 'guest'),
      ...Array.from(countsByUser.keys()),
      ...allUserRatings.map((rating) => rating.userId || 'guest'),
      ...dbUsers.map((user) => user.id),
    ]);

    // Fetch DB Users for public display names only. Account emails are private
    // and must not be included in the public leaderboard response.
    const dbUserMap = new Map(dbUsers.map((u) => [u.id, u]));
    const progressMap = new Map(allProgress.map((progress) => [progress.userId || 'guest', progress]));

    const leaderboard: LeaderboardUser[] = [];

    userIds.forEach((userId) => {
      const counts = countsByUser.get(userId) || { total: 0, accepted: 0 };
      const solved = solvedByUser.get(userId) || { easy: new Set<string>(), medium: new Set<string>(), hard: new Set<string>() };
      const easyCount = solved.easy.size;
      const medCount = solved.medium.size;
      const hardCount = solved.hard.size;
      const totalCount = easyCount + medCount + hardCount;

      // Keep every registered user visible. New users are unrated until they
      // submit, but hiding them makes the public leaderboard look like a demo.
      if (dbUserMap.has(userId) || counts.total > 0 || totalCount > 0 || userRatingMap.has(userId)) {
        const accuracy = counts.total > 0
          ? Math.round((counts.accepted / counts.total) * 1000) / 10
          : 0;

        const progressRec = progressMap.get(userId);
        const rating = userRatingMap.get(userId) || 0; // Default 0 for unrated users
        const dbUser = dbUserMap.get(userId);
        const streak = progressRec?.streak || 0;

        leaderboard.push({
          rank: 0,
          id: userId,
          name: dbUser?.name || (userId === 'guest' ? 'Guest Coder' : `Coder (${userId.slice(0, 6)})`),
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(dbUser?.name || userId)}`,
          rating,
          ratingTier: getRatingTier(rating),
          solved: {
            easy: easyCount,
            medium: medCount,
            hard: hardCount,
            total: totalCount,
          },
          accuracy,
          consistency: Math.min(100, Math.round(streak * 10 + Math.min(totalCount, 40))),
          country: 'Global',
          joinedAt: dbUser?.createdAt
            ? new Date(dbUser.createdAt).toISOString().split('T')[0]
            : progressRec?.lastActiveDate
              ? new Date(progressRec.lastActiveDate).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
          streak,
        });
      }
    });

    // Rating leads; progress metrics provide deterministic ordering for unrated
    // users and users with the same contest rating.
    leaderboard.sort((a, b) =>
      b.rating - a.rating ||
      b.solved.total - a.solved.total ||
      b.accuracy - a.accuracy ||
      b.consistency - a.consistency ||
      b.streak - a.streak ||
      a.name.localeCompare(b.name),
    );

    // Assign rank
    leaderboard.forEach((user, idx) => {
      user.rank = idx + 1;
    });

    return NextResponse.json({ leaderboard });
  } catch (error: unknown) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
