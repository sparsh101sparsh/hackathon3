export interface RatingTier {
  name: string;
  badge: string;
  colorClass: string;
  badgeBg: string;
  badgeText: string;
  minRating: number;
  maxRating: number;
}

export const RATING_TIERS: RatingTier[] = [
  {
    name: 'Bronze',
    badge: 'Bronze',
    colorClass: 'text-amber-600',
    badgeBg: 'bg-amber-950/40 border-amber-800/60',
    badgeText: 'text-amber-500',
    minRating: 800,
    maxRating: 1199,
  },
  {
    name: 'Silver',
    badge: 'Silver',
    colorClass: 'text-slate-400',
    badgeBg: 'bg-slate-900/60 border-slate-700/60',
    badgeText: 'text-slate-300',
    minRating: 1200,
    maxRating: 1399,
  },
  {
    name: 'Gold',
    badge: 'Gold',
    colorClass: 'text-yellow-400',
    badgeBg: 'bg-yellow-950/40 border-yellow-700/60',
    badgeText: 'text-yellow-400',
    minRating: 1400,
    maxRating: 1599,
  },
  {
    name: 'Platinum',
    badge: 'Platinum',
    colorClass: 'text-emerald-400',
    badgeBg: 'bg-emerald-950/40 border-emerald-700/60',
    badgeText: 'text-emerald-400',
    minRating: 1600,
    maxRating: 1899,
  },
  {
    name: 'Diamond',
    badge: 'Diamond',
    colorClass: 'text-cyan-400',
    badgeBg: 'bg-cyan-950/40 border-cyan-700/60',
    badgeText: 'text-cyan-400',
    minRating: 1900,
    maxRating: 2399,
  },
  {
    name: 'Master',
    badge: 'Grandmaster',
    colorClass: 'text-purple-400',
    badgeBg: 'bg-purple-950/40 border-purple-700/60',
    badgeText: 'text-purple-400 font-bold',
    minRating: 2400,
    maxRating: 3500,
  },
];

/**
 * Get rating tier title and styling parameters for a given rating.
 * Ratings <= 0 return Unrated status.
 */
export function getRatingTier(rating: number): RatingTier {
  if (rating <= 0) {
    return {
      name: 'Unrated',
      badge: 'Unrated',
      colorClass: 'text-slate-400',
      badgeBg: 'bg-slate-900/60 border-slate-700/60',
      badgeText: 'text-slate-400',
      minRating: 0,
      maxRating: 0,
    };
  }
  const clamped = Math.max(800, Math.min(3500, rating));
  if (clamped < 1200) return RATING_TIERS[0]; // Bronze
  if (clamped < 1400) return RATING_TIERS[1]; // Silver
  if (clamped < 1600) return RATING_TIERS[2]; // Gold
  if (clamped < 1900) return RATING_TIERS[3]; // Platinum
  if (clamped < 2400) return RATING_TIERS[4]; // Diamond
  return RATING_TIERS[5]; // Master
}

export interface ContestPerformanceInput {
  currentRating: number;
  rank: number;
  totalParticipants: number;
  score: number;
  maxScore: number;
  opponentRatings?: number[];
}

export interface RatingUpdateResult {
  oldRating: number;
  newRating: number;
  delta: number;
  expectedRank: number;
  performanceRating: number;
  oldTier: RatingTier;
  newTier: RatingTier;
}

/**
 * Calculate Codeforces-style rating changes for a contestant in a rated contest.
 */
export function calculateRatingUpdate(input: ContestPerformanceInput): RatingUpdateResult {
  const { currentRating, rank, totalParticipants, score, maxScore, opponentRatings = [] } = input;

  const N = Math.max(1, totalParticipants);
  const R_user = currentRating <= 0 ? 1200 : Math.max(800, Math.min(3500, currentRating));

  // 1. Estimate average opponent rating (or default to 1500)
  const avgOpponentRating =
    opponentRatings.length > 0
      ? opponentRatings.reduce((a, b) => a + b, 0) / opponentRatings.length
      : 1500;

  // 2. Expected Rank using Logistic Win Probability formula
  let expectedRank = 1;
  if (opponentRatings.length > 0) {
    for (const oppRating of opponentRatings) {
      const pWin = 1 / (1 + Math.pow(10, (oppRating - R_user) / 400));
      expectedRank += 1 - pWin;
    }
  } else {
    // Model expected rank based on user rating vs field average
    const pWinAverage = 1 / (1 + Math.pow(10, (avgOpponentRating - R_user) / 400));
    expectedRank = 1 + (N - 1) * (1 - pWinAverage);
  }

  // 3. Calculate Performance Rating based on rank and score ratio
  const scoreRatio = maxScore > 0 ? score / maxScore : 0;
  const rankPercentile = (N - rank + 0.5) / N;

  // Performance calculation: blend rank percentile and score ratio
  let performanceRating = avgOpponentRating + 400 * Math.log10(Math.max(0.01, rankPercentile / Math.max(0.01, 1 - rankPercentile)));
  performanceRating += (scoreRatio - 0.5) * 400;

  // 4. Rating Delta Calculation with K-factor based on current rating
  const kFactor = R_user < 1400 ? 50 : R_user < 2000 ? 40 : 30;
  
  // Delta proportional to (Expected Rank - Actual Rank) & Score factor
  const rankDiff = expectedRank - rank;
  let rawDelta = rankDiff * (kFactor / Math.sqrt(N)) + (scoreRatio - 0.5) * 20;

  // Clamp raw delta to realistic values per contest (-150 to +300)
  rawDelta = Math.max(-150, Math.min(300, Math.round(rawDelta)));

  let newRating = Math.round(R_user + rawDelta);
  newRating = Math.max(800, Math.min(3500, newRating));
  const delta = newRating - R_user;

  const oldTier = getRatingTier(currentRating);
  const newTier = getRatingTier(newRating);

  return {
    oldRating: currentRating,
    newRating,
    delta,
    expectedRank: Math.round(expectedRank * 10) / 10,
    performanceRating: Math.round(performanceRating),
    oldTier,
    newTier,
  };
}
