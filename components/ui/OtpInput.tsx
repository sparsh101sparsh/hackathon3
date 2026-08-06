'use client';

import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value = '',
  onChange,
  onComplete,
  disabled = false,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  const digits = Array.from({ length: 6 }, (_, i) => value[i] || '');

  useEffect(() => {
    // Focus first input on mount if empty
    if (inputsRef.current[0] && !value) {
      inputsRef.current[0].focus();
    }
  }, [value]);

  const handleChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '');
    if (!val) {
      // User deleted value
      const newDigits = [...digits];
      newDigits[index] = '';
      const newCode = newDigits.join('');
      onChange(newCode);
      return;
    }

    if (val.length > 1) {
      const newCode = (digits.slice(0, index).join('') + val).slice(0, 6);
      onChange(newCode);
      if (newCode.length === 6 && onComplete) {
        onComplete(newCode);
      } else {
        const focusIndex = Math.min(index + val.length, 5);
        inputsRef.current[focusIndex]?.focus();
      }
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = val;
    const newCode = newDigits.join('');
    onChange(newCode);

    if (newCode.length === 6 && onComplete) {
      onComplete(newCode);
    } else if (index < 5 && inputsRef.current[index + 1]) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0 && inputsRef.current[index - 1]) {
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      onChange(pastedData);
      if (pastedData.length === 6 && onComplete) {
        onComplete(pastedData);
      }
      const focusIndex = Math.min(pastedData.length, 5);
      inputsRef.current[focusIndex]?.focus();
    }
  };

  return (
    <div className="flex items-center justify-between gap-2 sm:gap-3">
      {Array.from({ length: 6 }).map((_, idx) => (
        <input
          key={idx}
          ref={(el) => {
            inputsRef.current[idx] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="\d*"
          maxLength={1}
          autoComplete="one-time-code"
          disabled={disabled}
          aria-label={`Verification code digit ${idx + 1}`}
          value={digits[idx] || ''}
          onChange={(e) => handleChange(idx, e)}
          onKeyDown={(e) => handleKeyDown(idx, e)}
          onPaste={handlePaste}
          className={`w-11 h-13 sm:w-13 sm:h-15 text-center text-xl font-bold font-mono rounded-xl bg-slate-950/90 border transition-all duration-200 focus:outline-none ${
            digits[idx]
              ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 shadow-lg shadow-emerald-500/10'
              : 'border-slate-800 text-slate-100 focus:border-amber-500 focus:ring-1 focus:ring-amber-500'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        />
      ))}
    </div>
  );
};
