import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;

    const problem = await prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: true,
        codeTemplates: true,
      },
    });

    if (!problem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...problem,
      topicTags: safeParseJsonArray(problem.topicTags),
      companyTags: safeParseJsonArray(problem.companyTags),
    });
  } catch (error: unknown) {
    console.error('Error fetching admin problem detail:', error);
    return NextResponse.json(
      { error: 'Failed to fetch problem detail' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();

    const existingProblem = await prisma.problem.findUnique({ where: { id } });
    if (!existingProblem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    const {
      title,
      slug,
      statement,
      inputFormat,
      outputFormat,
      constraints,
      difficulty,
      topicTags,
      companyTags,
      editorial,
      timeLimit,
      memoryLimit,
      sampleTestCases,
      hiddenTestCases,
      codeTemplates,
    } = body;

    const updateData: Prisma.ProblemUpdateInput = {};
    if (title !== undefined) updateData.title = title;
    if (slug !== undefined) updateData.slug = slug;
    if (statement !== undefined) updateData.statement = statement;
    if (inputFormat !== undefined) updateData.inputFormat = inputFormat;
    if (outputFormat !== undefined) updateData.outputFormat = outputFormat;
    if (constraints !== undefined) updateData.constraints = constraints;
    if (difficulty !== undefined) {
      const normalizedDifficulty = typeof difficulty === 'string' ? difficulty.toUpperCase() : '';
      if (!['EASY', 'MEDIUM', 'HARD'].includes(normalizedDifficulty)) {
        return NextResponse.json({ error: 'difficulty must be EASY, MEDIUM, or HARD' }, { status: 400 });
      }
      updateData.difficulty = normalizedDifficulty;
    }
    if (editorial !== undefined) updateData.editorial = editorial;
    if (timeLimit !== undefined) {
      const parsedTimeLimit = Number(timeLimit);
      if (!Number.isFinite(parsedTimeLimit) || parsedTimeLimit <= 0 || parsedTimeLimit > 60) {
        return NextResponse.json({ error: 'timeLimit must be a number greater than 0 and at most 60 seconds' }, { status: 400 });
      }
      updateData.timeLimit = parsedTimeLimit;
    }
    if (memoryLimit !== undefined) {
      const parsedMemoryLimit = Number(memoryLimit);
      if (!Number.isInteger(parsedMemoryLimit) || parsedMemoryLimit < 1 || parsedMemoryLimit > 4096) {
        return NextResponse.json({ error: 'memoryLimit must be an integer between 1 and 4096 MB' }, { status: 400 });
      }
      updateData.memoryLimit = parsedMemoryLimit;
    }

    if (topicTags !== undefined) {
      updateData.topicTags = Array.isArray(topicTags)
        ? JSON.stringify(topicTags)
        : typeof topicTags === 'string' && topicTags.startsWith('[')
        ? topicTags
        : JSON.stringify([topicTags].filter(Boolean));
    }

    if (companyTags !== undefined) {
      updateData.companyTags = Array.isArray(companyTags)
        ? JSON.stringify(companyTags)
        : typeof companyTags === 'string' && companyTags.startsWith('[')
        ? companyTags
        : JSON.stringify([companyTags].filter(Boolean));
    }

    // Update base problem
    await prisma.problem.update({
      where: { id },
      data: updateData,
    });

    // Handle test cases update if provided
    if (sampleTestCases !== undefined || hiddenTestCases !== undefined) {
      await prisma.testCase.deleteMany({ where: { problemId: id } });

      const allTestCases = [
        ...(sampleTestCases || []).map((tc: TestCaseInput) => ({
          problemId: id,
          input: tc.input || '',
          expectedOutput: tc.expectedOutput || '',
          isSample: true,
          explanation: tc.explanation || null,
        })),
        ...(hiddenTestCases || []).map((tc: TestCaseInput) => ({
          problemId: id,
          input: tc.input || '',
          expectedOutput: tc.expectedOutput || '',
          isSample: false,
          explanation: tc.explanation || null,
        })),
      ];

      if (allTestCases.length > 0) {
        await prisma.testCase.createMany({
          data: allTestCases,
        });
      }
    }

    // Handle code templates update if provided
    if (codeTemplates !== undefined) {
      await prisma.codeTemplate.deleteMany({ where: { problemId: id } });

      const templatesData = (codeTemplates || []).map((t: CodeTemplateInput) => ({
        problemId: id,
        language: t.language.toLowerCase(),
        code: t.code,
      }));

      if (templatesData.length > 0) {
        await prisma.codeTemplate.createMany({
          data: templatesData,
        });
      }
    }

    const updatedProblem = await prisma.problem.findUnique({
      where: { id },
      include: {
        testCases: true,
        codeTemplates: true,
      },
    });

    return NextResponse.json({
      ...updatedProblem,
      topicTags: safeParseJsonArray(updatedProblem?.topicTags || '[]'),
      companyTags: safeParseJsonArray(updatedProblem?.companyTags || '[]'),
    });
  } catch (error: unknown) {
    console.error('Error updating problem:', error);
    return NextResponse.json(
      { error: 'Failed to update problem' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const { id } = await params;

    const existingProblem = await prisma.problem.findUnique({ where: { id } });
    if (!existingProblem) {
      return NextResponse.json({ error: 'Problem not found' }, { status: 404 });
    }

    await prisma.problem.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Problem deleted successfully',
    });
  } catch (error: unknown) {
    console.error('Error deleting problem:', error);
    return NextResponse.json(
      { error: 'Failed to delete problem' },
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
