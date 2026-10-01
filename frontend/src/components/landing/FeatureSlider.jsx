import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Lightweight interactive workflow slider for PolicyLens landing page
 */
export default function FeatureSlider() {
  const slides = [
    {
      id: 1,
      tag: 'Step 01',
      title: 'Upload',
      headline: 'Upload complex regulations, policies, and contracts',
      description:
        'Support for multi-page regulatory PDFs and plain text policies. Preserves page boundaries and extracts text with UTF-8 precision.',
      icon: UploadCloud,
      color: 'cyan',
      badgeClass: 'bg-cyan-950/60 text-neon-cyan border-cyan-500/30',
      actionText: 'Try Document Upload',
      actionLink: '/upload',
    },
    {
      id: 2,
      tag: 'Step 02',
      title: 'Understand',
      headline: 'AI identifies important compliance requirements',
      description:
        'Deep regulatory clause decomposition distinguishes mandatory obligations from background text and identifies cross-border scope.',
      icon: Sparkles,
      color: 'purple',
      badgeClass: 'bg-purple-950/60 text-purple-300 border-purple-500/30',
      actionText: 'View Analysis Engine',
      actionLink: '/analysis',
    },
    {
      id: 3,
      tag: 'Step 03',
      title: 'Act',
      headline: 'Convert requirements into actionable tasks',
      description:
        'Every clause is converted into direct departmental assignments (Legal, IT Security, HR, Operations) with required evidentiary proof.',
      icon: CheckCircle2,
      color: 'blue',
      badgeClass: 'bg-blue-950/60 text-neon-blue border-blue-500/30',
      actionText: 'Explore Action Matrix',
      actionLink: '/dashboard',
    },
    {
      id: 4,
      tag: 'Step 04',
      title: 'Track',
      headline: 'Monitor compliance progress and statutory deadlines',
      description:
        'Real-time compliance readiness score, statutory calendar countdowns, and audit trail generation for enterprise risk leaders.',
      icon: TrendingUp,
      color: 'emerald',
      badgeClass: 'bg-emerald-950/60 text-neon-green border-emerald-500/30',
      actionText: 'Open Command Center',
      actionLink: '/dashboard',
    },
  ];

  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, slides.length]);

  const activeSlide = slides[current];
  const Icon = activeSlide.icon;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative rounded-3xl bg-[#0B1020]/90 border border-slate-800/90 p-6 sm:p-10 shadow-[0_12px_40px_rgba(0,0,0,0.6)] backdrop-blur-xl overflow-hidden"
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Slider Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/80 mb-8 relative z-10">
        <div>
          <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
            Product Lifecycle
          </span>
          <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
            How PolicyLens Transforms Compliance
          </h3>
        </div>

        {/* Step Tabs for Quick Direct Switching */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#050816]/80 border border-slate-800 self-start sm:self-auto">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrent(idx)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-all ${
                current === idx
                  ? 'bg-cyan-950/80 text-neon-cyan border border-cyan-500/40 shadow-[0_0_12px_rgba(0,245,212,0.2)]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
              }`}
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Main Slide Card Content */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[220px]">
        {/* Left icon & tag visual */}
        <div className="lg:col-span-4 flex flex-col items-start">
          <span className={`inline-flex items-center gap-1.5 text-xs font-mono font-bold px-3 py-1 rounded-full border mb-4 ${activeSlide.badgeClass}`}>
            {activeSlide.tag} • {activeSlide.title}
          </span>
          <div className="w-20 h-20 rounded-2xl bg-[#0F172A] border border-slate-700/80 flex items-center justify-center text-cyan-400 shadow-[0_0_30px_rgba(0,245,212,0.15)] mb-2">
            <Icon className="w-10 h-10" />
          </div>
        </div>

        {/* Right detailed information */}
        <div className="lg:col-span-8 space-y-4">
          <h4 className="text-xl sm:text-2xl font-bold text-white leading-snug">
            {activeSlide.headline}
          </h4>
          <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl font-normal">
            {activeSlide.description}
          </p>

          <div className="pt-2">
            <Link
              to={activeSlide.actionLink}
              className="inline-flex items-center gap-2 text-xs font-mono font-semibold text-neon-cyan hover:text-white transition group"
            >
              <span>{activeSlide.actionText}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Controls (Arrows + Progress Dots) */}
      <div className="flex items-center justify-between pt-8 mt-6 border-t border-slate-800/80 relative z-10">
        {/* Dots */}
        <div className="flex items-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrent(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${
                current === idx
                  ? 'w-8 bg-neon-cyan shadow-[0_0_8px_#00F5D4]'
                  : 'w-2 bg-slate-700 hover:bg-slate-500'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>

        {/* Left / Right arrow triggers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
            className="p-2 rounded-xl bg-[#0F172A] border border-slate-800 text-slate-400 hover:text-white hover:border-cyan-500/40 hover:bg-[#111C32] transition"
            aria-label="Previous slide"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
            className="p-2 rounded-xl bg-[#0F172A] border border-slate-800 text-slate-400 hover:text-white hover:border-cyan-500/40 hover:bg-[#111C32] transition"
            aria-label="Next slide"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
