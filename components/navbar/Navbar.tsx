'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import {
  BarChart3,
  Bot,
  Brain,
  Building2,
  ChevronDown,
  Code2,
  Github,
  LayoutDashboard,
  LogIn,
  LogOut,
  Sparkles,
  Trophy,
  UserPlus,
  Menu,
  X,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const githubUrl = 'https://github.com/sparsh101sparsh/hackathon3';

  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isMobileMenuOpen && !isProfileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
        setIsProfileMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, isProfileMenuOpen]);

  useEffect(() => {
    if (!isProfileMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isProfileMenuOpen]);

  // Hide main navbar inside problem detail view if it uses full screen workspace layout
  if (pathname.startsWith('/problems/') && pathname !== '/problems') {
    return null;
  }

  const navLinks = [
    { label: 'Problems', href: '/problems', icon: <Code2 className="h-4 w-4" aria-hidden="true" /> },
    { label: 'Visualizer', href: '/visualizer', icon: <Sparkles className="h-4 w-4" aria-hidden="true" /> },
    { label: 'Revision Deck', href: '/revision', icon: <Brain className="h-4 w-4" aria-hidden="true" /> },
    { label: 'AI Mock Interview', href: '/mock-interview', icon: <Bot className="h-4 w-4" aria-hidden="true" /> },
    { label: 'Company Prep', href: '/company', icon: <Building2 className="h-4 w-4" aria-hidden="true" /> },
    { label: 'Contests', href: '/contests', icon: <Trophy className="h-4 w-4" aria-hidden="true" /> },
  ];

  const profileLinks = [
    { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" aria-hidden="true" /> },
    { label: 'Leaderboard', href: '/leaderboard', icon: <BarChart3 className="h-4 w-4" aria-hidden="true" /> },
  ];

  return (
    <nav className="liquid-navbar sticky top-0 z-50 flex h-14 items-center justify-between px-4 font-sans sm:px-6">
      {/* Left Brand Emblem & Nav Links */}
      <div className="flex min-w-0 items-center gap-4">
        {/* Glowing Logo Emblem */}
        <Link href="/" className="liquid-brand group flex items-center gap-2 text-white" aria-label="CodeForge home">
          <div className="liquid-brand-mark">
            <Code2 className="w-4 h-4" aria-hidden="true" />
          </div>
          <span className="text-[15px] font-medium leading-none">
            CodeForge<span className="liquid-brand-caret">_</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden xl:flex items-center gap-1.5">
          {navLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`liquid-nav-link flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium transition ${
                  isActive
                    ? 'liquid-nav-link-active text-cyan-50'
                    : 'text-slate-300/80 hover:text-white'
                }`}
              >
                {link.icon}
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Right Controls: Auth Buttons / User Profile */}
      <div className="hidden md:flex items-center gap-3">
        {user ? (
          <div ref={profileMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen((open) => !open)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="menu"
              className="liquid-profile flex items-center gap-2 p-1.5 pr-2 transition"
            >
              <Image
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`}
                alt={user.name}
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 shrink-0 rounded-md border border-white/10 bg-[#08080a] transition"
              />
              <span className="max-w-32 truncate text-sm font-medium text-slate-50">{user.name}</span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition ${isProfileMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
            </button>

            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  role="menu"
                  aria-label="Profile menu"
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="profile-menu absolute right-0 top-12 w-56 overflow-hidden rounded-lg border border-white/10 bg-[#101114] p-1.5 shadow-2xl"
                >
                  {profileLinks.map((link) => {
                    const isActive = pathname.startsWith(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        role="menuitem"
                        className={`profile-menu-link flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                          isActive ? 'bg-cyan-400/10 text-cyan-100' : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                        }`}
                      >
                        {link.icon}
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    role="menuitem"
                    className="profile-menu-link flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/[0.06] hover:text-white"
                  >
                    <Github className="h-4 w-4" aria-hidden="true" />
                    <span>GitHub</span>
                  </a>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => logout()}
                    className="profile-menu-link flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-rose-200 transition hover:bg-rose-400/10 hover:text-rose-100"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>Sign out</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="liquid-action-button flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-100"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span>Sign In</span>
            </Link>
            <Link
              href="/register"
              className="liquid-primary-button flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#071012]"
            >
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              <span>Sign Up</span>
            </Link>
          </div>
        )}
      </div>

      {/* Mobile Drawer Hamburger Button */}
      <div className="flex xl:hidden items-center gap-2">
        <button
          ref={menuButtonRef}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          type="button"
          aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-navigation-menu"
          className="liquid-icon-button h-9 w-9"
        >
          {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-navigation-menu"
            role="region"
            aria-label="Mobile navigation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="liquid-mobile-menu absolute left-0 top-14 z-50 w-full space-y-4 px-4 py-4 shadow-2xl xl:hidden"
          >
            <div className="space-y-1">
              {navLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`liquid-mobile-link flex items-center gap-3 px-4 py-3 text-sm font-medium transition ${
                      isActive
                        ? 'liquid-mobile-link-active text-cyan-50'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {link.icon}
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>

            <div className="pt-4 border-t border-slate-800 space-y-3">
              {user ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <Image
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.name)}`}
                      alt={user.name}
                      width={32}
                      height={32}
                      unoptimized
                      className="h-8 w-8 shrink-0 rounded-md border border-white/10 bg-slate-950"
                    />
                    <span className="truncate text-sm font-medium text-white">{user.name}</span>
                  </div>
                  {profileLinks.map((link) => {
                    const isActive = pathname.startsWith(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={`liquid-mobile-link flex items-center gap-3 px-4 py-3 text-sm font-medium transition ${
                          isActive
                            ? 'liquid-mobile-link-active text-cyan-50'
                            : 'text-slate-300 hover:text-white'
                        }`}
                      >
                        {link.icon}
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                  <a
                    href={githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="liquid-mobile-link flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-300 transition hover:text-white"
                  >
                    <Github className="h-4 w-4" aria-hidden="true" />
                    <span>GitHub</span>
                  </a>
                  <button
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                    type="button"
                    className="liquid-mobile-link flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-medium text-rose-200 transition hover:text-rose-100"
                    >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    <span>Sign out</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Link
                    href="/login"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="liquid-action-button flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-slate-100"
                  >
                    <LogIn className="h-4 w-4" aria-hidden="true" />
                    <span>Sign In</span>
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="liquid-primary-button flex items-center justify-center gap-2 py-2.5 text-xs font-medium text-[#071012]"
                  >
                    <UserPlus className="h-4 w-4" aria-hidden="true" />
                    <span>Sign Up</span>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export default Navbar;
