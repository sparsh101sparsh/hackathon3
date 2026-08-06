import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export interface TestCaseInput {
  input: string;
  expectedOutput: string;
  explanation?: string;
}

export interface CodeTemplateInput {
  language: string;
  code: string;
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const problems = await prisma.problem.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        testCases: true,
        codeTemplates: true,
        _count: {
          select: { submissions: true },
        },
      },
    });

    const formattedProblems = problems.map((p) => ({
      ...p,
      topicTags: safeParseJsonArray(p.topicTags),
      companyTags: safeParseJsonArray(p.companyTags),
    }));

    return NextResponse.json(formattedProblems);
  } catch (error: unknown) {
    console.error('Error fetching admin problems:', error);
    return NextResponse.json(
      { error: 'Failed to fetch admin problems' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const body = await request.json();
    const {
      title,
      slug: customSlug,
      statement,
      inputFormat,
      outputFormat,
      constraints,
      difficulty,
      topicTags = [],
      companyTags = [],
      editorial = '',
      timeLimit = 1.0,
      memoryLimit = 256,
      sampleTestCases = [],
      hiddenTestCases = [],
      codeTemplates = [],
    } = body;

    if (!title || !statement || !inputFormat || !outputFormat || !constraints || !difficulty) {
      return NextResponse.json(
        { error: 'Missing required problem fields (title, statement, inputFormat, outputFormat, constraints, difficulty)' },
        { status: 400 }
      );
    }

    const normalizedDifficulty = typeof difficulty === 'string' ? difficulty.toUpperCase() : '';
    if (!['EASY', 'MEDIUM', 'HARD'].includes(normalizedDifficulty)) {
      return NextResponse.json({ error: 'difficulty must be EASY, MEDIUM, or HARD' }, { status: 400 });
    }
    const parsedTimeLimit = Number(timeLimit);
    const parsedMemoryLimit = Number(memoryLimit);
    if (!Number.isFinite(parsedTimeLimit) || parsedTimeLimit <= 0 || parsedTimeLimit > 60) {
      return NextResponse.json({ error: 'timeLimit must be a number greater than 0 and at most 60 seconds' }, { status: 400 });
    }
    if (!Number.isInteger(parsedMemoryLimit) || parsedMemoryLimit < 1 || parsedMemoryLimit > 4096) {
      return NextResponse.json({ error: 'memoryLimit must be an integer between 1 and 4096 MB' }, { status: 400 });
    }

    // Generate slug if not provided
    const slug = (customSlug || title)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Check if slug exists
    const existingProblem = await prisma.problem.findUnique({ where: { slug } });
    if (existingProblem) {
      return NextResponse.json(
        { error: `Problem with slug "${slug}" already exists.` },
        { status: 400 }
      );
    }

    // Prepare JSON arrays for tags
    const topicTagsJson = Array.isArray(topicTags)
      ? JSON.stringify(topicTags)
      : typeof topicTags === 'string' && topicTags.startsWith('[')
      ? topicTags
      : JSON.stringify([topicTags].filter(Boolean));

    const companyTagsJson = Array.isArray(companyTags)
      ? JSON.stringify(companyTags)
      : typeof companyTags === 'string' && companyTags.startsWith('[')
      ? companyTags
      : JSON.stringify([companyTags].filter(Boolean));

    // Combine sample and hidden test cases
    const allTestCases = [
      ...sampleTestCases.map((tc: TestCaseInput) => ({
        input: tc.input || '',
        expectedOutput: tc.expectedOutput || '',
        isSample: true,
        explanation: tc.explanation || null,
      })),
      ...hiddenTestCases.map((tc: TestCaseInput) => ({
        input: tc.input || '',
        expectedOutput: tc.expectedOutput || '',
        isSample: false,
        explanation: tc.explanation || null,
      })),
    ];

    // Format code templates
    const templatesData = Array.isArray(codeTemplates)
      ? codeTemplates.map((t: CodeTemplateInput) => ({
          language: t.language.toLowerCase(),
          code: t.code,
        }))
      : [];

    // Create problem in database
    const createdProblem = await prisma.problem.create({
      data: {
        title,
        slug,
        statement,
        inputFormat,
        outputFormat,
        constraints,
        difficulty: normalizedDifficulty,
        topicTags: topicTagsJson,
        companyTags: companyTagsJson,
        editorial: editorial || '',
        timeLimit: parsedTimeLimit,
        memoryLimit: parsedMemoryLimit,
        testCases: {
          create: allTestCases,
        },
        codeTemplates: {
          create: templatesData,
        },
      },
      include: {
        testCases: true,
        codeTemplates: true,
      },
    });

    return NextResponse.json(
      {
        ...createdProblem,
        topicTags: safeParseJsonArray(createdProblem.topicTags),
        companyTags: safeParseJsonArray(createdProblem.companyTags),
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error creating problem:', error);
    return NextResponse.json(
      { error: 'Failed to create problem' },
      { status: 500 }
    );
  }
}

function safeParseJsonArray(str: string): string[] {
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
