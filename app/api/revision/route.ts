import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRequestToken, verifyToken } from '@/lib/auth';
import { rateLimitResponse } from '@/lib/rateLimit';
import type { RevisionCardDTO, RevisionDeckResponse } from '@/lib/types';
import { isRevisionQuality, nextRevisionInterval } from '@/lib/revisionSchedule';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const payload = verifyToken(getRequestToken(req) || '');

    const targetUserId = payload?.userId || 'guest';

    const cards = await prisma.revisionCard.findMany({
      where: { userId: targetUserId },
      include: {
        problem: {
          select: {
            id: true,
            title: true,
            slug: true,
            difficulty: true,
            topicTags: true,
            editorial: true,
            statement: true,
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    const now = new Date();
    const dueCards = cards.filter((c) => c.dueDate <= now);
    const masteredCount = cards.filter((c) => c.repetitions >= 3).length;
    const nextDueCard = cards.find((c) => c.dueDate > now) || null;
    const serializeCard = (card: (typeof cards)[number]): RevisionCardDTO => ({
      id: card.id,
      problemId: card.problemId,
      pattern: card.pattern,
      keyTakeaway: card.keyTakeaway,
      timeComplexity: card.timeComplexity,
      spaceComplexity: card.spaceComplexity,
      interval: card.interval,
      repetitions: card.repetitions,
      dueDate: card.dueDate.toISOString(),
      lastReviewedAt: card.lastReviewedAt?.toISOString() || null,
      failureCount: card.failureCount,
      lastFailureType: card.lastFailureType,
      lastError: card.lastError,
      lastFailedInput: card.lastFailedInput,
      lastExpectedOutput: card.lastExpectedOutput,
      lastActualOutput: card.lastActualOutput,
      learnedAt: card.learnedAt?.toISOString() || null,
      createdAt: card.createdAt.toISOString(),
      problem: card.problem,
    });

    const response: RevisionDeckResponse = {
      cards: cards.map(serializeCard),
      dueCards: dueCards.map(serializeCard),
      stats: {
        totalCards: cards.length,
        dueTodayCount: dueCards.length,
        masteredCount,
        learnedMistakeCount: cards.filter((c) => c.failureCount > 0).length,
        nextDueDate: nextDueCard?.dueDate.toISOString() || null,
      },
    };

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error fetching revision cards:', error);
    return NextResponse.json({ error: 'Failed to fetch revision flashcards' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const limitResponse = rateLimitResponse(
      req,
      'revision:review',
      60,
      60 * 1000,
      'Revision update rate limit reached. Please try again shortly.',
    );
    if (limitResponse) return limitResponse;

    const payload = verifyToken(getRequestToken(req) || '');
    if (!payload?.userId) {
      return NextResponse.json({ error: 'Sign in to review flashcards.' }, { status: 401 });
    }
    const body = await req.json();
    const { cardId, quality } = body; // quality: 'HARD' | 'GOOD' | 'EASY'

    if (typeof cardId !== 'string' || typeof quality !== 'string' || !cardId || !quality) {
      return NextResponse.json({ error: 'cardId and quality are required' }, { status: 400 });
    }

    const card = await prisma.revisionCard.findUnique({
      where: { id: cardId },
    });

    if (!card || card.userId !== payload.userId) {
      return NextResponse.json({ error: 'Flashcard not found' }, { status: 404 });
    }

    if (!isRevisionQuality(quality)) {
      return NextResponse.json({ error: 'quality must be HARD, GOOD, or EASY' }, { status: 400 });
    }

    let nextRepetitions = card.repetitions + 1;
    const nextInterval = nextRevisionInterval(card.interval, quality);

    const nextDueDate = new Date(Date.now() + nextInterval * 24 * 60 * 60 * 1000);

    const updatedCard = await prisma.revisionCard.update({
      where: { id: cardId },
      data: {
        interval: nextInterval,
        repetitions: nextRepetitions,
        dueDate: nextDueDate,
        lastReviewedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      card: updatedCard,
      nextDueDate,
    });
  } catch (error: unknown) {
    console.error('Error updating revision card:', error);
    return NextResponse.json({ error: 'Failed to update revision flashcard' }, { status: 500 });
  }
}
