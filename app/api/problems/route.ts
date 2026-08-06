import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { getSessionFromRequest } from '@/lib/auth';
import visualizerData from '@/public/data/visualizers.json';

export const dynamic = 'force-dynamic';


export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const difficulty = searchParams.get('difficulty')?.toUpperCase();
    const topic = searchParams.get('topic');
    const company = searchParams.get('company');
    const search = searchParams.get('search')?.trim();
    const rawRequestedIds = (searchParams.get('ids') || '')
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .slice(0, 100);
    if (search && search.length > 160) {
      return NextResponse.json({ error: 'Search query exceeds the 160-character limit' }, { status: 413 });
    }
    if (topic && topic.length > 80) {
      return NextResponse.json({ error: 'Topic filter exceeds the 80-character limit' }, { status: 413 });
    }
    if (company && company.length > 80) {
      return NextResponse.json({ error: 'Company filter exceeds the 80-character limit' }, { status: 413 });
    }
    if (rawRequestedIds.some((id) => id.length > 64)) {
      return NextResponse.json({ error: 'Problem ID filter contains an oversized value' }, { status: 413 });
    }
    const requestedIds = rawRequestedIds;
    const solved = searchParams.get('solved');
    const session = getSessionFromRequest(request);
    const userId = session?.userId || null;
    const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '20', 10);
    const prioritizeVisualizers = searchParams.get('visualizedFirst') === 'true';
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(100, requestedLimit)) : 20;

    // Fetch user solved problem IDs if userId provided
    let solvedProblemIds = new Set<string>();
    if (userId) {
      const acceptedSubmissions = await prisma.submission.findMany({
        where: {
          userId,
          status: 'Accepted',
        },
        select: {
          problemId: true,
        },
      });
      solvedProblemIds = new Set(acceptedSubmissions.map((s) => s.problemId));
    }

    const whereClause: Prisma.ProblemWhereInput = {};

    if (requestedIds.length > 0) {
      whereClause.id = { in: requestedIds };
    }

    if (difficulty && ['EASY', 'MEDIUM', 'HARD'].includes(difficulty)) {
      whereClause.difficulty = difficulty;
    }

    if (search) {
      whereClause.OR = [
        { title: { contains: search } },
        { statement: { contains: search } },
      ];
    }

    if (topic) {
      whereClause.topicTags = { contains: topic };
    }

    if (company) {
      whereClause.companyTags = { contains: company };
    }

    if (userId && (solved === 'true' || solved === 'false')) {
      whereClause.submissions = solved === 'true'
        ? { some: { userId, status: 'Accepted' } }
        : { none: { userId, status: 'Accepted' } };
    }

    const selectFields = {
      id: true, slug: true, title: true, statement: true, inputFormat: true,
      outputFormat: true, constraints: true, difficulty: true, topicTags: true,
      companyTags: true, timeLimit: true, memoryLimit: true, createdAt: true,
    } as const;
    // Keep the curated visualizer set ahead of the normal catalog without
    // loading every problem into a serverless function just to sort it.
    const [total, paginated] = prioritizeVisualizers && requestedIds.length === 0
      ? await (async () => {
        const visualizerIds = Object.keys(visualizerData);
        const visualizerWhere: Prisma.ProblemWhereInput = {
          ...whereClause,
          id: { in: visualizerIds },
        };
        const regularWhere: Prisma.ProblemWhereInput = {
          ...whereClause,
          id: { notIn: visualizerIds },
        };
        const [count, visualized] = await prisma.$transaction([
          prisma.problem.count({ where: whereClause }),
          prisma.problem.findMany({ where: visualizerWhere, orderBy: { createdAt: 'desc' }, take: visualizerIds.length, select: selectFields }),
        ]);
        const start = (page - 1) * limit;
        const pageVisualized = visualized.slice(start, start + limit);
        const remaining = limit - pageVisualized.length;
        if (remaining <= 0) return [count, pageVisualized] as const;

        const regularSkip = Math.max(0, start - visualized.length);
        const regular = await prisma.problem.findMany({
          where: regularWhere,
          orderBy: { createdAt: 'desc' },
          skip: regularSkip,
          take: remaining,
          select: selectFields,
        });
        return [count, [...pageVisualized, ...regular]] as const;
      })()
      : await prisma.$transaction([
      prisma.problem.count({ where: whereClause }),
      prisma.problem.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: selectFields,
      }),
    ]);
    const totalPages = Math.ceil(total / limit) || 1;

    // Format output
    const formattedProblems = paginated.map((p) => {
      let parsedTopicTags: string[] = [];
      let parsedCompanyTags: string[] = [];

      try {
        parsedTopicTags = JSON.parse(p.topicTags);
      } catch {
        parsedTopicTags = [];
      }

      try {
        parsedCompanyTags = JSON.parse(p.companyTags);
      } catch {
        parsedCompanyTags = [];
      }

      return {
        ...p,
        topicTags: parsedTopicTags,
        companyTags: parsedCompanyTags,
        solved: userId ? solvedProblemIds.has(p.id) : false,
      };
    });

    return NextResponse.json({
      problems: formattedProblems,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error: unknown) {
    console.error('Error fetching problems:', error);
    return NextResponse.json(
      { error: 'Unable to load the problem catalog right now. Please try again shortly.' },
      { status: 500 }
    );
  }
}
