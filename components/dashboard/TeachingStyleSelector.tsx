'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Check, ChevronDown, ChevronUp, Bot } from 'lucide-react';
import { useTeachingStyle } from '@/hooks/useTeachingStyle';
import { TeachingStyle, TeachingStyleId } from '@/lib/teachingStyles';

interface PersonalityCardProps {
  personality: TeachingStyle;
  isSelected: boolean;
  onSelect: (id: TeachingStyleId) => void;
}

function PersonalityAvatar({
  personality,
  size = 'md',
}: {
  personality: TeachingStyle;
  size?: 'sm' | 'md' | 'lg';
}) {
  const sizeClass = size === 'sm' ? 'w-5 h-5' : size === 'lg' ? 'w-11 h-11' : 'w-10 h-10';
  const imageSize = size === 'sm' ? 20 : size === 'lg' ? 44 : 40;
  const iconClass = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <div className={`${sizeClass} rounded-lg bg-slate-950/80 border border-white/10 overflow-hidden flex items-center justify-center flex-shrink-0 shadow-inner`}>
      {personality.avatar ? (
        <Image
          src={personality.avatar}
          alt=""
          width={imageSize}
          height={imageSize}
          className="h-full w-full object-cover"
          aria-hidden="true"
        />
      ) : (
        <Bot className={`${iconClass} text-sky-300`} aria-hidden="true" />
      )}
    </div>
  );
}

function PersonalityCard({ personality, isSelected, onSelect }: PersonalityCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect(personality.id)}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
      className={`
        relative w-full text-left rounded-xl border p-4 transition-all duration-300 cursor-pointer
        ${isSelected
          ? 'bg-[#17171b] border-amber-300/35'
          : 'bg-slate-900/60 border-slate-800/60 hover:border-slate-600/60 hover:bg-slate-800/40'
        }
      `}
    >
      {/* Selected badge */}
      {isSelected && (
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="absolute top-2 right-2 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center shadow-md"
        >
          <Check className="w-3 h-3 text-white" strokeWidth={3} />
        </motion.div>
      )}

      <div className="flex items-start gap-3">
        <PersonalityAvatar personality={personality} size="lg" />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-slate-200'}`}>
              {personality.name}
            </span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
              isSelected ? 'bg-white/15 text-white/80' : 'bg-slate-800 text-slate-400'
            }`}>
              {personality.title}
            </span>
          </div>
          <p className={`text-[11px] leading-relaxed ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
            {personality.shortDesc}
          </p>
          <p className={`text-[10px] mt-1 italic ${isSelected ? 'text-white/50' : 'text-slate-600'}`}>
            {personality.tagline}
          </p>
        </div>
      </div>
    </motion.button>
  );
}

export function TeachingStyleSelector() {
  const { personality, teachingStyleId, setTeachingStyle, allTeachingStyles, isLoaded } = useTeachingStyle();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!isLoaded) {
    return (
      <div className="w-full bg-slate-900/50 border border-slate-800/50 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-slate-800 rounded w-1/3 mb-3" />
        <div className="h-14 bg-slate-800 rounded" />
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg bg-amber-300/10 border border-amber-300/20 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-sky-300" />
        </div>
        <div>
        <h2 className="text-sm font-bold text-white">Teaching Style</h2>
        <p className="text-[11px] text-slate-500">Shapes how your tutor, hints, and reviews speak to you</p>
        </div>
        <div className="ml-auto">
            <span className="text-[10px] bg-amber-300/10 text-amber-100 border border-amber-300/20 rounded-full px-2 py-0.5 inline-flex items-center gap-1">
            <PersonalityAvatar personality={personality} size="sm" /> {personality.name}
          </span>
        </div>
      </div>

      {/* Currently selected — compact preview */}
      <motion.button
        type="button"
        aria-expanded={isExpanded}
        aria-controls="personality-options"
        onClick={() => setIsExpanded((prev) => !prev)}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className={`
          w-full flex items-center gap-3 rounded-xl border p-3.5 transition-all duration-300
          bg-[#17171b] border-amber-300/25
        `}
      >
        <PersonalityAvatar personality={personality} />
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-white">{personality.name}</span>
            <span className="text-[10px] bg-white/15 text-white/80 rounded-full px-1.5 py-0.5">{personality.title}</span>
            <span className="text-[10px] text-white/40 ml-auto">{personality.era}</span>
          </div>
          <p className="text-[11px] text-white/60 mt-0.5">{personality.shortDesc}</p>
        </div>
        <div className="flex-shrink-0">
          {isExpanded
            ? <ChevronUp className="w-4 h-4 text-white/50" />
            : <ChevronDown className="w-4 h-4 text-white/50" />
          }
        </div>
      </motion.button>

      {/* Personality Grid — expandable */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="personality-options"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-1.5">
              {/* Info banner */}
              <div className="flex items-center gap-2 bg-amber-300/5 border border-amber-300/15 rounded-lg px-3 py-2 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-amber-200 flex-shrink-0" />
                <p className="text-[11px] text-slate-400">
                  Your tutor, hints, code reviews, mock interviews, and recommendations will all speak in this personality&apos;s unique voice.
                </p>
              </div>

              {/* Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {allTeachingStyles.map((p) => (
                  <PersonalityCard
                    key={p.id}
                    personality={p}
                    isSelected={p.id === teachingStyleId}
                    onSelect={(id) => {
                      setTeachingStyle(id);
                      setIsExpanded(false);
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
