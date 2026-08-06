'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Terminal,
  Sparkles,
  Lightbulb,
  Trophy,
  BarChart3,
  Building2,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';

export const CoreFeaturesGrid: React.FC = () => {
  const features = [
    {
      title: 'Judge0 Execution Engine',
      desc: 'Secure containerized sandbox executing C++, Python, JavaScript, Java, and Go in milliseconds with detailed verdict output.',
      icon: <Terminal className="w-6 h-6 text-amber-200" />,
      badge: 'Sandboxed Runner',
      link: '/problems',
      color: 'hover:border-amber-300/35',
    },
    {
      title: 'Automated Code Audit',
      desc: 'Get instant analysis on time/space complexity, edge case vulnerabilities, and refactoring suggestions powered by FreeModel.',
      icon: <Sparkles className="w-6 h-6 text-violet-300" />,
      badge: 'FreeModel',
      link: '/problems',
      color: 'hover:border-violet-300/35',
    },
    {
      title: '3-Level Progressive Hints',
      desc: 'Never get stuck again. Unlock hints incrementally: 1) High-level strategy, 2) Algorithmic breakdown, 3) Pseudocode structure.',
      icon: <Lightbulb className="w-6 h-6 text-emerald-300" />,
      badge: 'Zero Spoilers',
      link: '/problems',
      color: 'hover:border-emerald-300/35',
    },
    {
      title: 'Codeforces Rated Contests',
      desc: 'Start an on-demand rated battle, invite friends, or face the AI judge with a focused problem set.',
      icon: <Trophy className="w-6 h-6 text-sky-300" />,
      badge: 'Elo Rating System',
      link: '/contests',
      color: 'hover:border-sky-300/35',
    },
    {
      title: 'Recharts Analytics Dashboard',
      desc: 'Visualize topic mastery with radar charts, track rating progression curves, and maintain your GitHub-style activity heatmaps.',
      icon: <BarChart3 className="w-6 h-6 text-teal-300" />,
      badge: 'Visual Insights',
      link: '/dashboard',
      color: 'hover:border-teal-300/35',
    },
    {
      title: 'Company Specific Prep',
      desc: 'Curated problem collections tagged by Google, Meta, Amazon, Apple, and Netflix, complete with frequency tags.',
      icon: <Building2 className="w-6 h-6 text-rose-300" />,
      badge: '8 Tech Giants',
      link: '/company',
      color: 'hover:border-rose-300/35',
    },
  ];

  return (
    <section className="py-16 px-6 max-w-7xl mx-auto space-y-12">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-[#111115] border border-white/10 text-slate-300 text-xs font-semibold">
          <Zap className="w-3.5 h-3.5 text-amber-200" />
          <span>Complete Competitive Engineering Suite</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-semibold text-white tracking-tight">
          Everything You Need to Master DSA
        </h2>
        <p className="text-sm sm:text-base text-slate-400 max-w-2xl mx-auto">
          Built for software engineers, competitive programmers, and tech interview candidates seeking a high-performance practice platform.
        </p>
      </div>

      {/* Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((item, idx) => (
          <motion.div
            key={item.title}
            initial={false}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.08 }}
            whileHover={{ y: -5 }}
            className={`p-6 rounded-lg bg-[#101114]/65 border border-white/10 transition-all duration-300 flex flex-col justify-between group ${item.color}`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-lg bg-slate-950/70 border border-white/10 group-hover:scale-110 transition-transform">
                  {item.icon}
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-950/80 text-slate-300 border border-slate-800">
                  {item.badge}
                </span>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-white tracking-tight group-hover:text-amber-100 transition-colors">
                  {item.title}
                </h3>
                <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed">
                  {item.desc}
                </p>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href={item.link}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-200 hover:text-amber-100 transition group-hover:translate-x-1"
              >
                <span>Learn More</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
};
