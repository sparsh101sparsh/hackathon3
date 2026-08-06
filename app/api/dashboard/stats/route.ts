import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRatingTier } from '@/lib/rating';

export const dynamic = 'force-dynamic';

export interface DashboardStatsResponse {
  user: {
    name: string;
    email: string;
    avatar: string;
    rating: number;
    ratingTier: ReturnType<typeof getRatingTier>;
    streak: number;
  };
  solved: {
    easy: number;
    medium: number;
    hard: number;
    total: number;
    totalEasy: number;
    totalMedium: number;
    totalHard: number;
  };
  accuracy: number;
  avgTime: {
    easy: string;
    medium: string;
    hard: string;
  };
  topicMastery: Array<{
    topic: string;
    solved: number;
    total: number;
    percentage: number;
  }>;
  ratingHistory: Array<{
    date: string;
    rating: number;
    delta: number;
    contestTitle: string;
  }>;
  activityMatrix: Array<{
    date: string;
    count: number;
    level: 0 | 1 | 2 | 3 | 4;
  }>;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master';
    unlocked: boolean;
    unlockedAt?: string;
    progress?: number;
  }>;
}

import { getSessionFromRequest } from '@/lib/auth';
import { rateLimitResponse } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  try {
    const limitResponse = rateLimitResponse(
      req,
      'dashboard:stats',
      30,
      60 * 1000,
      'Dashboard refresh rate limit reached. Please try again shortly.',
    );
    if (limitResponse) return limitResponse;

    const payload = getSessionFromRequest(req);

    const targetUserId = payload?.userId || 'guest';
    const dbUser = payload?.userId
      ? await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { name: true, email: true },
      })
      : null;

    const userName = dbUser?.name || 'Guest Coder';
    const userEmail = dbUser?.email || 'guest@codeforge.dev';

    const userProgress = await prisma.userProgress.findUnique({
      where: { userId: targetUserId },
    });

    const userRatings = await prisma.userRating.findMany({
      where: { userId: targetUserId },
      select: {
        rating: true,
        delta: true,
        timestamp: true,
        contest: { select: { title: true } },
      },
      orderBy: { timestamp: 'asc' },
    });

    // Get real catalog totals with one grouped count query and one topic query.
    const activityStart = new Date(Date.now() - 364 * 24 * 60 * 60 * 1000);
    const [difficultyCounts, topicCatalog, totalSubmissions, acceptedSubmissionCount, acceptedProblemGroups, recentSubmissions] = await prisma.$transaction([
      prisma.problem.groupBy({
        by: ['difficulty'],
        orderBy: { difficulty: 'asc' },
        _count: { _all: true },
      }),
      prisma.problem.findMany({ select: { id: true, topicTags: true } }),
      prisma.submission.count({ where: { userId: targetUserId } }),
      prisma.submission.count({ where: { userId: targetUserId, status: 'Accepted' } }),
      prisma.submission.groupBy({
        by: ['problemId'],
        where: { userId: targetUserId, status: 'Accepted' },
        orderBy: { problemId: 'asc' },
      }),
      prisma.submission.findMany({
        where: { userId: targetUserId, createdAt: { gte: activityStart } },
        select: { createdAt: true },
      }),
    ]);

    const acceptedProblemIds = acceptedProblemGroups.map((submission) => submission.problemId);
    const acceptedProblems = acceptedProblemIds.length > 0
      ? await prisma.problem.findMany({
        where: { id: { in: acceptedProblemIds } },
        select: { id: true, difficulty: true },
      })
      : [];

    const catalogCount = (difficulty: string) => {
      const entry = difficultyCounts.find((item) => item.difficulty === difficulty);
      return entry && typeof entry._count === 'object' ? entry._count._all ?? 0 : 0;
    };
    const sysTotalEasy = catalogCount('EASY');
    const sysTotalMedium = catalogCount('MEDIUM');
    const sysTotalHard = catalogCount('HARD');

    let solvedEasy = 0;
    let solvedMedium = 0;
    let solvedHard = 0;
    let streak = userProgress?.streak ?? 0;
    let currentRating = userRatings.length > 0 ? userRatings[userRatings.length - 1].rating : 0;

    const accuracy = totalSubmissions > 0
      ? Math.round((acceptedSubmissionCount / totalSubmissions) * 1000) / 10
      : 0;

    const acceptedProblemIdSet = new Set(acceptedProblemIds);
    acceptedProblems.forEach((problem) => {
      if (problem.difficulty === 'EASY') solvedEasy++;
      else if (problem.difficulty === 'MEDIUM') solvedMedium++;
      else if (problem.difficulty === 'HARD') solvedHard++;
    });

    const totalSolved = solvedEasy + solvedMedium + solvedHard;

    // 1. Topic Mastery based on real problems in database and real solved problems
    const TOPICS_LIST = [
      'Arrays & Hashing',
      'Two Pointers',
      'Sliding Window',
      'Trees & Graphs',
      'Dynamic Programming',
      'Stack & Queue',
    ];

    const topicMasteryList = TOPICS_LIST.map((topic) => {
      const topicLower = topic.toLowerCase();
      const matchesTopic = (topicTags: string) => {
        try {
          const tags: string[] = JSON.parse(topicTags || '[]');
          return tags.some((tag) => topicLower.includes(tag.toLowerCase()) || tag.toLowerCase().includes(topicLower));
        } catch {
          return false;
        }
      };
      const topicTotalCount = topicCatalog.filter((problem) => matchesTopic(problem.topicTags)).length;
      const topicSolvedCount = Array.from(acceptedProblemIdSet).filter((problemId) => {
        const catalogProblem = topicCatalog.find((problem) => problem.id === problemId);
        return Boolean(catalogProblem && matchesTopic(catalogProblem.topicTags));
      }).length;
      const percentage = topicTotalCount > 0
        ? Math.min(100, Math.round((topicSolvedCount / topicTotalCount) * 100))
        : 0;
      return {
        topic,
        solved: topicSolvedCount,
        total: topicTotalCount,
        percentage,
      };
    });

    // 2. Rating History from real ratings
    const ratingHistory = userRatings.map((ur) => ({
      date: new Date(ur.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      rating: ur.rating,
      delta: ur.delta,
      contestTitle: ur.contest?.title || 'Rated Contest',
    }));

    // 3. Activity Matrix from real submission dates
    const today = new Date();
    const activityMatrix: Array<{ date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }> = [];
    const submissionMap = new Map<string, number>();

    recentSubmissions.forEach((sub) => {
      const dateStr = new Date(sub.createdAt).toISOString().split('T')[0];
      submissionMap.set(dateStr, (submissionMap.get(dateStr) || 0) + 1);
    });

    for (let i = 363; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const count = submissionMap.get(dateStr) || 0;

      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (count >= 7) level = 4;
      else if (count >= 4) level = 3;
      else if (count >= 2) level = 2;
      else if (count >= 1) level = 1;

      activityMatrix.push({ date: dateStr, count, level });
    }

    // 4. Badges
    const badges = [
      {
        id: 'bronze-coder',
        name: 'Bronze Solver',
        description: 'Solve 10 Easy Problems',
        icon: '',
        tier: 'Bronze' as const,
        unlocked: totalSolved >= 10,
        unlockedAt: totalSolved >= 10 ? new Date().toISOString().split('T')[0] : undefined,
        progress: Math.min(100, Math.round((totalSolved / 10) * 100)),
      },
      {
        id: 'silver-master',
        name: 'Silver Knight',
        description: 'Achieve 1200+ Contest Rating',
        icon: '',
        tier: 'Silver' as const,
        unlocked: currentRating >= 1200,
        unlockedAt: currentRating >= 1200 ? new Date().toISOString().split('T')[0] : undefined,
        progress: Math.min(100, Math.round((currentRating / 1200) * 100)),
      },
      {
        id: 'gold-grinder',
        name: 'Gold Strategist',
        description: 'Solve 25+ Problems & 7-Day Streak',
        icon: '',
        tier: 'Gold' as const,
        unlocked: totalSolved >= 25 && streak >= 7,
        unlockedAt: totalSolved >= 25 && streak >= 7 ? new Date().toISOString().split('T')[0] : undefined,
        progress: Math.min(100, Math.round((totalSolved / 25) * 100)),
      },
      {
        id: 'platinum-wizard',
        name: 'Platinum Architect',
        description: 'Achieve 1600+ Rating & Solve 10 Mediums',
        icon: '',
        tier: 'Platinum' as const,
        unlocked: currentRating >= 1600 && solvedMedium >= 10,
        unlockedAt: undefined,
        progress: Math.min(100, Math.round((currentRating / 1600) * 100)),
      },
      {
        id: 'diamond-titan',
        name: 'Diamond Titan',
        description: 'Reach 1900+ Rating in Rated Contests',
        icon: '',
        tier: 'Diamond' as const,
        unlocked: currentRating >= 1900,
        unlockedAt: undefined,
        progress: Math.min(100, Math.round((currentRating / 1900) * 100)),
      },
      {
        id: 'grandmaster-legend',
        name: 'Master Overlord',
        description: 'Reach Master (2400+) Rating Status',
        icon: '',
        tier: 'Master' as const,
        unlocked: currentRating >= 2400,
        unlockedAt: undefined,
        progress: Math.min(100, Math.round((currentRating / 2400) * 100)),
      },
    ];

    const responseData: DashboardStatsResponse = {
      user: {
        name: userName,
        email: userEmail,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(userName)}`,
        rating: currentRating,
        ratingTier: getRatingTier(currentRating),
        streak,
      },
      solved: {
        easy: solvedEasy,
        medium: solvedMedium,
        hard: solvedHard,
        total: totalSolved,
        totalEasy: sysTotalEasy,
        totalMedium: sysTotalMedium,
        totalHard: sysTotalHard,
      },
      accuracy,
      avgTime: {
        easy: totalSolved > 0 ? '12 min' : '-',
        medium: totalSolved > 0 ? '25 min' : '-',
        hard: totalSolved > 0 ? '45 min' : '-',
      },
      topicMastery: topicMasteryList,
      ratingHistory,
      activityMatrix,
      badges,
    };

    return NextResponse.json(responseData);
  } catch (error: unknown) {
    console.error('Error in /api/dashboard/stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  }
}
