import React from 'react';

interface DifficultyBadgeProps {
  difficulty: string;
  className?: string;
}

export const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({ difficulty, className = '' }) => {
  const diff = (difficulty || '').toUpperCase();
  let colorClasses = 'bg-slate-900 text-slate-300 border-slate-700';
  let label = difficulty || 'Unknown';

  if (diff === 'EASY') {
    colorClasses = 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60';
    label = 'Easy';
  } else if (diff === 'MEDIUM') {
    colorClasses = 'bg-amber-950/80 text-amber-400 border-amber-800/60';
    label = 'Medium';
  } else if (diff === 'HARD') {
    colorClasses = 'bg-rose-950/80 text-rose-400 border-rose-800/60';
    label = 'Hard';
  }

  return (
    <span className={`px-2.5 py-0.5 text-xs font-bold rounded-md border ${colorClasses} ${className}`}>
      {label}
    </span>
  );
};

export default DifficultyBadge;
