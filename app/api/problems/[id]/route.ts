import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const includeEditorial = searchParams.get('includeEditorial') === 'true';

    const problem = await prisma.problem.findFirst({
      where: {
        OR: [{ id: id }, { slug: id }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        statement: true,
        inputFormat: true,
        outputFormat: true,
        constraints: true,
        difficulty: true,
        topicTags: true,
        companyTags: true,
        editorial: true,
        timeLimit: true,
        memoryLimit: true,
        createdAt: true,
        testCases: {
          where: { isSample: true },
          select: {
            id: true,
            input: true,
            expectedOutput: true,
            isSample: true,
            explanation: true,
          },
        },
        codeTemplates: {
          select: {
            id: true,
            language: true,
            code: true,
          },
        },
      },
    });

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    let parsedTopicTags: string[] = [];
    let parsedCompanyTags: string[] = [];

    try {
      parsedTopicTags = JSON.parse(problem.topicTags);
    } catch {
      parsedTopicTags = [];
    }

    try {
      parsedCompanyTags = JSON.parse(problem.companyTags);
    } catch {
      parsedCompanyTags = [];
    }

    const responseData = {
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      statement: problem.statement,
      inputFormat: problem.inputFormat,
      outputFormat: problem.outputFormat,
      constraints: problem.constraints,
      difficulty: problem.difficulty,
      topicTags: parsedTopicTags,
      companyTags: parsedCompanyTags,
      timeLimit: problem.timeLimit,
      memoryLimit: problem.memoryLimit,
      editorial: includeEditorial ? problem.editorial : null,
      testCases: problem.testCases,
      codeTemplates: problem.codeTemplates,
      createdAt: problem.createdAt,
    };

    return NextResponse.json(responseData);
  } catch (error: unknown) {
    console.error('Error fetching problem details:', error);
    return NextResponse.json(
      { error: 'Unable to load this problem right now. Please try again shortly.' },
      { status: 500 }
    );
  }
}
