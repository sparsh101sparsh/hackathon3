'use client';

import React from 'react';
import { Check, Circle } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password?: string;
}

export function evaluatePasswordStrength(password: string = '') {
  let score = 0;
  if (!password) return { score: 0, label: '', color: 'bg-slate-800', textColor: 'text-slate-500' };

  const hasLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (hasLength) score += 1;
  if (hasUpper && hasLower) score += 1;
  if (hasNumber) score += 1;
  if (hasSpecial) score += 1;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-rose-500', textColor: 'text-rose-400' };
  if (score === 2) return { score: 2, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-400' };
  if (score === 3) return { score: 3, label: 'Strong', color: 'bg-amber-500', textColor: 'text-amber-400' };
  return { score: 4, label: 'Excellent', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password = '' }) => {
  if (!password) return null;

  const strength = evaluatePasswordStrength(password);
  const percent = (strength.score / 4) * 100;

  const hasMinLength = password.length >= 8;
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  return (
    <div className="space-y-2 mt-2 pt-1">
      <div className="flex items-center justify-between text-[11px] font-medium">
        <span className="text-slate-400">Password Strength:</span>
        <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
      </div>

      <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
        <div
          className={`h-full transition-all duration-300 ${strength.color}`}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
        <span className={hasMinLength ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
          {hasMinLength ? <Check className="w-3 h-3 inline" aria-hidden="true" /> : <Circle className="w-3 h-3 inline" aria-hidden="true" />} 8+ Chars
        </span>
        <span className={hasNumber ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
          {hasNumber ? <Check className="w-3 h-3 inline" aria-hidden="true" /> : <Circle className="w-3 h-3 inline" aria-hidden="true" />} 1 Number
        </span>
        <span className={hasSpecial ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
          {hasSpecial ? <Check className="w-3 h-3 inline" aria-hidden="true" /> : <Circle className="w-3 h-3 inline" aria-hidden="true" />} 1 Symbol
        </span>
      </div>
    </div>
  );
};
