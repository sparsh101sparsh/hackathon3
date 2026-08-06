import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { callFreeModelJSON, MODELS } from '@/lib/freemodel';
import { getSessionFromRequest } from '@/lib/auth';
import { getTeachingStyle, buildTeachingStylePrefix } from '@/lib/teachingStyles';
import { rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export interface DailyRecommendation {
  id: string;
  title: string;
  slug: string;
  difficulty: string;
  topicTags: string[];
  companyTags: string[];
  aiReason: string;
  targetSkill: string;
}

export async function GET(request: NextRequest) {
  try {
    const limitResponse = rateLimitResponse(request, 'ai:recommendations', 10, 60 * 1000);
    if (limitResponse) return limitResponse;
    const { searchParams } = new URL(request.url);
    const userId = getSessionFromRequest(request)?.userId || 'guest';
    const personalityId = searchParams.get('personality');

    // Fetch user progress or fallback
    let userProgress = await prisma.userProgress.findUnique({
      where: { userId },
    });

    const solvedEasy = userProgress?.solvedEasy || 0;
    const solvedMedium = userProgress?.solvedMedium || 0;
    const solvedHard = userProgress?.solvedHard || 0;

    // Read the complete catalog so recommendation selection is never limited to the first page.
    const allProblems = await prisma.problem.findMany({
      orderBy: { title: 'asc' },
      select: {
        id: true,
        title: true,
        slug: true,
        difficulty: true,
        topicTags: true,
        companyTags: true,
      },
    });

    if (!allProblems || allProblems.length === 0) {
      return NextResponse.json({ recommendations: [] });
    }

    // Select deterministic representatives across the complete catalog.
    const candidateIndexes = [
      0,
      Math.floor((allProblems.length - 1) / 2),
      Math.max(0, allProblems.length - 1),
    ];
    const selectedProblems = [...new Set(candidateIndexes)].map((index) => allProblems[index]).map((p) => ({
      ...p,
      topicTags: typeof p.topicTags === 'string' ? JSON.parse(p.topicTags) : p.topicTags,
      companyTags: typeof p.companyTags === 'string' ? JSON.parse(p.companyTags) : p.companyTags,
    }));

    const personality = getTeachingStyle(personalityId);
    const personalityPrefix = buildTeachingStylePrefix(personality);

    const systemInstruction = `${personalityPrefix}${personality.recommendationsSystemInstruction}

You are analyzing user solving stats across the complete ${allProblems.length}-question catalog:
Solved Easy: ${solvedEasy}, Solved Medium: ${solvedMedium}, Solved Hard: ${solvedHard}.

Generate personalized recommendations for 3 selected problems.
Output MUST be a raw JSON array of objects matching schema:
[
  {
    "problemId": "string ID of the problem",
    "aiReason": "1-2 sentence guided explanation of why this problem is recommended today for the user",
    "targetSkill": "Key skill or pattern being targeted e.g. Dynamic Programming Optimization"
  }
]`;

    const userInstruction = `Candidate Problems:
${JSON.stringify(
  selectedProblems.map((p) => ({ id: p.id, title: p.title, difficulty: p.difficulty, topicTags: p.topicTags }))
)}`;

    const fallbackAnalysis = selectedProblems.map((p, idx) => ({
      problemId: p.id,
      aiReason:
        idx === 0
          ? `Based on your ${solvedMedium} solved Medium problems, this will help solidify your foundational hash mapping and array techniques.`
          : idx === 1
          ? `Targeted recommendation to strengthen your problem-solving speed under typical Meta and Google interview time constraints.`
          : `Recommended by guided to expand your mastery into multi-pointer and sliding window algorithmic patterns.`,
      targetSkill: p.topicTags[0] || 'Data Structures',
    }));

    const aiAnalysis = await callFreeModelJSON<Array<{ problemId: string; aiReason: string; targetSkill: string }>>({
      model: MODELS.FAST,
      systemInstruction,
      userInstruction,
      temperature: 0.5,
      fallbackJson: fallbackAnalysis,
    });

    const recommendations: DailyRecommendation[] = selectedProblems.map((p, idx) => {
      const match = Array.isArray(aiAnalysis) ? aiAnalysis.find((a) => a.problemId === p.id) : null;
      return {
        id: p.id,
        title: p.title,
        slug: p.slug,
        difficulty: p.difficulty,
        topicTags: p.topicTags,
        companyTags: p.companyTags,
        aiReason: match?.aiReason || fallbackAnalysis[idx].aiReason,
        targetSkill: match?.targetSkill || fallbackAnalysis[idx].targetSkill,
      };
    });

    return NextResponse.json({ recommendations });
  } catch (error: unknown) {
    console.error('Error in /api/ai/recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily recommendations' },
      { status: 500 }
    );
  }
}
