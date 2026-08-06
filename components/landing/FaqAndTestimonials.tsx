'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown,
  HelpCircle,
  Zap,
  Shield,
  Brain,
  Trophy,
  Code2,
  BarChart3,
} from 'lucide-react';

interface FaqItem {
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    question: 'How does code execution work?',
    answer:
      'Code is sent to Judge0 CE — an isolated execution engine. Each run is sandboxed with strict time and memory limits. Supported languages: Python, C++, JavaScript (Node.js), Java, and Go. No code ever touches the application host.',
  },
  {
    question: 'How are guided responses generated?',
    answer:
      'The platform uses a FreeModel-compatible provider for hints, tutoring, code review, and interview analysis, with deterministic fallbacks when the provider is unavailable.',
  },
  {
    question: 'How does the rating system work?',
    answer:
      'Ratings follow a Codeforces-style Elo algorithm. Your rating (800–3500) updates after each contest based on rank vs expected rank, problem scores, and time penalties. Tiers: Newbie → Pupil → Specialist → Expert → Candidate Master → Master → Grandmaster.',
  },
  {
    question: 'How do progressive hints work?',
    answer:
      'Hints unlock in 3 levels: Level 1 gives a high-level intuition and mental model. Level 2 reveals the algorithmic strategy and data structure choice. Level 3 provides a code skeleton and key logic pattern. The full solution is never shown directly.',
  },
  {
    question: 'Can I practice company-specific questions?',
    answer:
      'Yes. The Company Prep section has curated problem lists for Google, Amazon, Microsoft, Meta, Apple, Netflix, Uber, and Flipkart — each tagged by interview frequency and difficulty distribution.',
  },
  {
    question: 'Is this a personal/open-source project?',
    answer:
      'Yes — CodeForge is an independent personal project, not a commercial product. The source code is on GitHub. Feel free to explore, fork, and contribute.',
  },
];

const TRUST_STATS = [
  { icon: <Code2 className="w-5 h-5 text-amber-400" />, value: '600+', label: 'DSA Problems', sub: 'Arrays → Advanced DP' },
  { icon: <Brain className="w-5 h-5 text-amber-300" />, value: '6', label: 'Guidance Tools', sub: 'Review · Hints · Tutor · Mock' },
  { icon: <Zap className="w-5 h-5 text-amber-400" />, value: '5', label: 'Languages', sub: 'Python · C++ · JS · Java · Go' },
  { icon: <Trophy className="w-5 h-5 text-amber-300" />, value: '8', label: 'Company Preps', sub: 'FAANG + Uber + Flipkart' },
  { icon: <BarChart3 className="w-5 h-5 text-amber-200" />, value: 'Elo', label: 'Rating System', sub: '800 – 3500 range' },
  { icon: <Shield className="w-5 h-5 text-slate-300" />, value: 'CE', label: 'Judge0 Runner', sub: 'Hosted isolated execution' },
];

export const FaqAndTestimonials: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (idx: number) => {
    setOpenIndex(openIndex === idx ? null : idx);
  };

  return (
    <section className="py-16 px-6 max-w-7xl mx-auto space-y-20">

      {/* Trust Stats Strip */}
      <div className="space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111115] border border-white/10 text-amber-300 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Platform at a Glance</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            What&apos;s Under the Hood
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            A personal project built with modern tools, real code execution, and real data.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {TRUST_STATS.map((stat, idx) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.07 }}
              whileHover={{ y: -3, scale: 1.02 }}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl text-center flex flex-col items-center gap-2 shadow-lg hover:border-slate-700 transition-all duration-200"
            >
              <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800">
                {stat.icon}
              </div>
              <div className="text-xl font-black text-white">{stat.value}</div>
              <div className="text-xs font-bold text-slate-300 leading-tight">{stat.label}</div>
              <div className="text-[10px] text-slate-500 leading-tight">{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-slate-800/60" />

      {/* FAQ Accordion Section */}
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#111115] border border-white/10 text-amber-300 text-xs font-semibold">
            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>FAQ</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Common Questions
          </h2>
          <p className="text-sm text-slate-400">
            How the platform works under the hood.
          </p>
        </div>

        <div className="space-y-2">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;
            return (
              <motion.div
                key={faq.question}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: idx * 0.05 }}
                className={`rounded-xl border transition-colors duration-200 overflow-hidden shadow-lg ${
                  isOpen
                    ? 'border-amber-400/30 bg-[#111115]'
                    : 'border-white/10 bg-[#0f0f12] hover:border-white/20'
                }`}
              >
                <button
                  onClick={() => toggleFaq(idx)}
                  className="w-full px-6 py-4 flex items-center justify-between text-left"
                >
                  <span className="text-sm sm:text-base font-bold text-slate-100 pr-4">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0 ${
                    isOpen ? 'rotate-180 text-amber-400' : ''
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="px-6 pb-5 pt-1 text-sm text-slate-400 border-t border-slate-800/60 leading-relaxed">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Bottom CTA strip */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="rounded-lg border border-white/10 bg-[#0f0f12] p-8 sm:p-10 text-center"
      >
        <div className="text-3xl sm:text-4xl font-bold text-white mb-3">
          Your next solved problem starts here.
        </div>
        <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Open the workspace and build a practice loop that remembers where you need work.
        </p>
        <Link
          href="/problems"
          className="inline-flex items-center gap-2 px-5 py-3 rounded-md bg-amber-400 text-[#08080a] font-bold text-sm hover:bg-amber-300 transition-colors"
        >
          <Code2 className="w-4 h-4" />
          Open problems
        </Link>
      </motion.div>

    </section>
  );
};
