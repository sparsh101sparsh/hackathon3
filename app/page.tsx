'use client';

import React from 'react';
import { HeroSection } from '@/components/landing/HeroSection';
import { MonacoPreviewDemo } from '@/components/landing/MonacoPreviewDemo';
import { CoreFeaturesGrid } from '@/components/landing/CoreFeaturesGrid';
import { FaqAndTestimonials } from '@/components/landing/FaqAndTestimonials';

export default function Home() {
  return (
    <div
      className="min-h-screen text-slate-100 overflow-x-hidden relative"
      style={{
        background:
          'linear-gradient(180deg, rgba(14,22,28,0.8) 0%, rgba(8,8,10,0) 42%), #08080a',
      }}
    >
      {/* 1. Hero Section */}
      <HeroSection />

      {/* 2. Interactive Monaco Preview and review demo */}
      <MonacoPreviewDemo />

      {/* 3. Core Features Grid */}
      <CoreFeaturesGrid />

      {/* 4. Stats, FAQ & CTA */}
      <FaqAndTestimonials />
    </div>
  );
}
