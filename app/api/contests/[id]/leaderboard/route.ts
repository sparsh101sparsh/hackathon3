import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getRatingTier, RatingTier } from '@/lib/rating';

export const dynamic = 'force-dynamic';

export interface ScoreboardParticipant {
  rank: number;
  userId: string;
  name: string;
  avatar: string;
  rating: number;
  ratingTier: RatingTier;
  totalScore: number;
  penaltyTime: number; // in minutes
  problemScores: Record<string, { points: number; timeMinutes: number; attempts: number }>;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contestId } = await params;

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      select: { id: true },
    });
    if (!contest) {
      return NextResponse.json({ error: 'Contest not found' }, { status: 404 });
    }

    const dbParticipants = await prisma.contestParticipant.findMany({
      where: { contestId },
      orderBy: [
        { score: 'desc' },
        { finishTime: 'asc' },
      ],
    });

    const leaderboard: ScoreboardParticipant[] = dbParticipants.map((p, idx) => ({
      rank: idx + 1,
      userId: p.userId || 'guest',
      name: p.name || 'Guest Coder',
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(p.userId || 'Guest')}`,
      rating: p.newRating || 0,
      ratingTier: getRatingTier(p.newRating || 0),
      totalScore: p.score,
      penaltyTime: 0,
      problemScores: {},
    }));

    return NextResponse.json({ leaderboard });
  } catch (error: unknown) {
    console.error('Error fetching contest leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch contest leaderboard' },
      { status: 500 }
    );
  }
}
