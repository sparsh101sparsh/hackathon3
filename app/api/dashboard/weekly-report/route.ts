import { NextRequest, NextResponse } from 'next/server';
import { callFreeModelJSON, MODELS } from '@/lib/freemodel';
import { prisma } from '@/lib/prisma';
import { getSessionFromRequest } from '@/lib/auth';
import { rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export interface WeeklyReportResponse {
  summary: string;
  strengths: string[];
  focusAreas: string[];
  recommendations: string[];
  estimatedRatingGain: number;
}

function buildFallbackReport(userName: string, accuracy: number, streak: number): WeeklyReportResponse {
  const summary =
    streak > 0
      ? `${userName} demonstrated strong commitment with a ${streak}-day active streak, advancing in algorithmic problem solving.`
      : `${userName} is ready to kickstart their daily streak today and accelerate their progress in Dynamic Programming and Graph algorithms.`;

  return {
    summary,
    strengths: [
      accuracy > 0
        ? `Submission accuracy of ${accuracy}% across attempted problems`
        : 'Active participation in exploring platform problem sets',
      streak > 0
        ? `Consistent daily practice maintaining a ${streak}-day active streak`
        : 'Proactive engagement in exploring targeted problem categories',
      'Fast implementation speed on Stack and String parsing questions',
    ],
    focusAreas: [
      'Hard DP state transitions (Knapsack & Tree DP variants)',
      'Graph Shortest Path optimizations (Dijkstra vs Bellman-Ford tradeoffs)',
      'Contest penalty time management during high-pressure timed rounds',
    ],
    recommendations: [
      streak === 0
        ? 'Solve 1 problem today to start your active streak!'
        : 'Solve 3 Medium Dynamic Programming problems (e.g. Coin Change, Longest Common Subsequence)',
      'Participate in the upcoming CodeForge Rated Contest to test time management',
      'Review space complexity trade-offs in Graph Traversal algorithms',
    ],
    estimatedRatingGain: 45,
  };
}

export async function GET(req: NextRequest) {
  try {
    const limitResponse = rateLimitResponse(
      req,
      'dashboard:weekly-report',
      8,
      60 * 1000,
      'Weekly report refresh rate limit reached. Please try again shortly.',
    );
    if (limitResponse) return limitResponse;

    const session = getSessionFromRequest(req);
    if (!session?.userId) {
      return NextResponse.json(buildFallbackReport('Guest Coder', 0, 0));
    }

    const userId = session.userId;
    let userName = session.name || 'Guest Coder';

    // Fetch real user record if available
    if (session?.userId) {
      const dbUser = await prisma.user.findUnique({ where: { id: session.userId } });
      if (dbUser?.name) userName = dbUser.name;
    }

    let solvedEasy = 0;
    let solvedMedium = 0;
    let solvedHard = 0;
    let streak = 0;
    let currentRating = 0;

    const userProgress = await prisma.userProgress.findUnique({
      where: { userId },
    });

    if (userProgress) {
      solvedEasy = userProgress.solvedEasy;
      solvedMedium = userProgress.solvedMedium;
      solvedHard = userProgress.solvedHard;
      streak = userProgress.streak;
    }

    const latestRating = await prisma.userRating.findFirst({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
    if (latestRating) {
      currentRating = latestRating.rating;
    }

    const weekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [totalSubmissions, acceptedSubmissions] = await prisma.$transaction([
      prisma.submission.count({ where: { userId, createdAt: { gte: weekStart } } }),
      prisma.submission.count({ where: { userId, status: 'Accepted', createdAt: { gte: weekStart } } }),
    ]);
    const accuracy = totalSubmissions > 0
      ? Math.round((acceptedSubmissions / totalSubmissions) * 100)
      : 0;

    const systemInstruction = `You are a CodeForge Performance Coach analyzing weekly coding progress.
Provide concise, highly motivating weekly progress insights for competitive programming and interview prep.
CRITICAL STREAK RULE: If Active Streak is 0 days, do NOT claim the user has a strong streak or consistent daily practice. Instead, encourage them to solve 1 problem today to kickstart their streak!

Return ONLY valid JSON matching this schema:
{
  "summary": "1-2 sentence executive summary of user progress this week",
  "strengths": ["array of 2-3 specific algorithmic areas or habits done well"],
  "focusAreas": ["array of 2-3 specific topics that need improvement"],
  "recommendations": ["array of 3 actionable study/practice recommendations"],
  "estimatedRatingGain": number (expected rating increase if advice followed, e.g. +45)
}`;

    const userInstruction = `User: ${userName}
Current Rating: ${currentRating === 0 ? 'Unrated (0)' : currentRating}
Solved Breakdown: Easy: ${solvedEasy}, Medium: ${solvedMedium}, Hard: ${solvedHard}
Submission Accuracy: ${accuracy}%
Active Streak: ${streak} days`;

    const fallbackReport = buildFallbackReport(userName, accuracy, streak);

    const report = await callFreeModelJSON<WeeklyReportResponse>({
      model: MODELS.FAST,
      systemInstruction,
      userInstruction,
      temperature: 0.5,
      timeoutMs: 2500,
      fallbackJson: fallbackReport,
    });

    return NextResponse.json(report);
  } catch (error: unknown) {
    console.error('Error in /api/dashboard/weekly-report:', error);
    return NextResponse.json(
      { error: 'Failed to generate weekly report' },
      { status: 500 }
    );
  }
}
