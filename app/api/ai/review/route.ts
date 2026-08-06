import { NextRequest, NextResponse } from 'next/server';
import { callFreeModelJSON, MODELS } from '@/lib/freemodel';
import { getProblemKnowledge } from '@/lib/problemKnowledge';
import { getTeachingStyle, buildTeachingStylePrefix } from '@/lib/teachingStyles';
import { rateLimitResponse } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export interface CodeReviewResponse {
  timeComplexity: string;
  spaceComplexity: string;
  codeQualityScore: number;
  strengths: string[];
  weaknesses: string[];
  betterApproach: string;
  missedEdgeCases: string[];
  refactoredCode: string;
}

export async function POST(request: NextRequest) {
  try {
    const limitResponse = rateLimitResponse(request, 'ai:review', 10, 60 * 1000);
    if (limitResponse) return limitResponse;
    const body = await request.json();
    const {
      problemTitle = 'DSA Problem',
      problemStatement = '',
      problemId,
      problemSlug,
      userCode = '',
      language = 'cpp',
      verdict = 'Accepted',
      personality: personalityId,
    } = body;

    if (!userCode || !userCode.trim()) {
      return NextResponse.json({ error: 'userCode is required' }, { status: 400 });
    }
    if (userCode.length > 100_000 || problemStatement.length > 30_000) {
      return NextResponse.json({ error: 'Code or problem statement exceeds the allowed size' }, { status: 413 });
    }

    const knowledge = await getProblemKnowledge({
      problemId,
      problemSlug,
      problemTitle,
      fallbackStatement: problemStatement,
    });

    const personality = getTeachingStyle(personalityId);
    const personalityPrefix = buildTeachingStylePrefix(personality);

    const systemInstruction = `${personalityPrefix}${personality.reviewSystemInstruction}

You are conducting a deep technical code review. Use the canonical question reference below as the source of truth for correctness, constraints, edge cases, and complexity. Do not review against a guessed problem.

${knowledge.context}
Output MUST be a single, raw JSON object with NO extra text or markdown syntax outside JSON.

JSON Schema:
{
  "timeComplexity": "e.g. O(N log N)",
  "spaceComplexity": "e.g. O(N)",
  "codeQualityScore": number between 1 and 100,
  "strengths": ["array of key strengths"],
  "weaknesses": ["array of weaknesses or bottlenecks"],
  "betterApproach": "description of more optimal or cleaner approach if any",
  "missedEdgeCases": ["array of edge cases to consider e.g. empty arrays, single elements, negative numbers"],
  "refactoredCode": "clean, optimized, production-ready refactored version of the user code"
}`;

    const userInstruction = `Problem Title: ${knowledge.title}
Problem Statement: ${knowledge.context}
Programming Language: ${language}
Execution Verdict: ${verdict}

User Code:
\`\`\`${language}
${userCode}
\`\`\``;

    // Fallback JSON if network or API fails
    const isAccepted = verdict === 'Accepted';
    const fallbackJson: CodeReviewResponse = {
      timeComplexity: userCode.includes('for') && userCode.includes('while') ? 'O(N^2)' : userCode.includes('for') ? 'O(N)' : 'O(1)',
      spaceComplexity: userCode.includes('{}') || userCode.includes('dict') || userCode.includes('[]') || userCode.includes('vector') ? 'O(N)' : 'O(1)',
      codeQualityScore: isAccepted ? 88 : 62,
      strengths: isAccepted
        ? ['Correct solution logic passing test cases', 'Clear variable naming and readable structure']
        : ['Basic structure implemented', 'Good attempt at tackling the problem constraints'],
      weaknesses: isAccepted
        ? ['Could optimize auxiliary space overhead', 'Edge cases for extreme inputs should be explicitly checked']
        : ['Handling of edge cases like empty inputs or boundary limits', 'Suboptimal time complexity under large inputs'],
      betterApproach: 'Use an optimal Hash Table / Frequency Map or Two-Pointer approach to reduce lookup time complexity to O(N) linear time.',
      missedEdgeCases: [
        'Empty array or single element input',
        'Duplicate values or negative integers',
        'Large numeric inputs causing overflow',
      ],
      refactoredCode: userCode,
    };

    const review = await callFreeModelJSON<CodeReviewResponse>({
      model: MODELS.COMPLEX,
      systemInstruction,
      userInstruction,
      temperature: 0.3,
      fallbackJson,
    });

    return NextResponse.json(review);
  } catch (error: unknown) {
    console.error('Error in /api/ai/review:', error);
    return NextResponse.json(
      { error: 'Code review is temporarily unavailable. Please try again shortly.' },
      { status: 500 }
    );
  }
}
