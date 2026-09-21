'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { Code2 } from 'lucide-react';

export const Footer: React.FC = () => {
  const pathname = usePathname();

  // Hide footer inside full screen workspace editor routes
  if ((pathname.startsWith('/problems/') && pathname !== '/problems') || pathname === '/visualizer') {
    return null;
  }

  return (
    <footer className="w-full bg-[#0a0a0d] border-t border-white/10 text-slate-400 text-xs py-12 px-6 font-sans relative z-10">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
        {/* Brand Column */}
        <div className="md:col-span-2 space-y-4">
          <Link href="/" className="flex items-center gap-2 text-white font-black text-lg tracking-tight">
            <div className="p-1.5 rounded-lg bg-amber-400 text-[#08080a] shadow-md shadow-amber-400/10">
              <Code2 className="w-5 h-5 fill-slate-950" />
            </div>
            <span>CodeRev</span>
          </Link>

          <p className="text-slate-400 leading-relaxed max-w-sm">
            Competitive programming platform. Master DSA, run code in an isolated Judge0 environment, and prepare for technical interviews.
          </p>

          {/* System Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>Judge0 Code Engine enabled</span>
          </div>
        </div>

        {/* Platform Links */}
        <div className="space-y-3">
          <h4 className="text-white font-bold text-sm tracking-tight">Platform</h4>
          <ul className="space-y-2">
            <li>
              <Link href="/problems" className="hover:text-amber-300 transition">
                Problems Workspace
              </Link>
            </li>
            <li>
              <Link href="/contests" className="hover:text-amber-300 transition">
                Rated Contests
              </Link>
            </li>
            <li>
              <Link href="/company" className="hover:text-amber-300 transition">
                Company Prep
              </Link>
            </li>
            <li>
              <Link href="/mock-interview" className="hover:text-amber-300 transition">
            Mock Interview
              </Link>
            </li>
            <li>
              <Link href="/leaderboard" className="hover:text-amber-300 transition">
                Global Leaderboard
              </Link>
            </li>
          </ul>
        </div>

        {/* Features Links */}
        <div className="space-y-3">
          <h4 className="text-white font-bold text-sm tracking-tight">Features</h4>
          <ul className="space-y-2">
            <li>
              <Link href="/dashboard" className="hover:text-amber-300 transition">
                Analytics Dashboard
              </Link>
            </li>
            <li>
              <Link href="/problems" className="hover:text-amber-300 transition">
                Judge0 Code Execution
              </Link>
            </li>
            <li>
              <Link href="/problems" className="hover:text-amber-300 transition">
                3-Level Progressive Hints
              </Link>
            </li>
            <li>
              <Link href="/admin" className="hover:text-amber-300 transition">
                Admin Panel
              </Link>
            </li>
          </ul>
        </div>

        {/* Legal & Social */}
        <div className="space-y-3">
          <h4 className="text-white font-bold text-sm tracking-tight">Community</h4>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/sparsh101sparsh/CodeRev"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub"
              className="p-2 rounded-lg bg-[#111115] border border-white/10 text-slate-400 hover:text-white hover:border-amber-400/40 transition"
            >
              <Image src="/companies/github.svg" alt="" width={16} height={16} unoptimized className="w-4 h-4 invert opacity-90" aria-hidden="true" />
            </a>
          </div>
          <p className="text-[11px] text-slate-500 pt-2">
            CodeRev is built for candidate engineers and technical interview preparation.
          </p>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="max-w-7xl mx-auto pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
        <div>
          © {new Date().getFullYear()} CodeRev. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <span>Privacy Policy</span>
          <span>•</span>
          <span>Terms of Service</span>
          <span>•</span>
          <span>Security Attestation</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
