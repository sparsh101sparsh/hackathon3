export type RevisionQuality = 'HARD' | 'GOOD' | 'EASY';

export function isRevisionQuality(value: unknown): value is RevisionQuality {
  return value === 'HARD' || value === 'GOOD' || value === 'EASY';
}

export function nextRevisionInterval(currentInterval: number, quality: RevisionQuality): number {
  const safeInterval = Number.isFinite(currentInterval) && currentInterval > 0
    ? currentInterval
    : 1;

  if (quality === 'HARD') return 1;
  if (quality === 'GOOD') return Math.max(2, Math.round(safeInterval * 2));
  return Math.max(3, Math.round(safeInterval * 3.5));
}
