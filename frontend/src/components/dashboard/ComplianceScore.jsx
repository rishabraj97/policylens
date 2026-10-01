import React, { useState, useEffect } from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * Prominent circular SVG Compliance Score visualization (Section 4)
 * Displays formula: completed / total * 100, safe zero handling, and
 * explicit "X of Y requirements completed" summary.
 */
export default function ComplianceScore({
  percentage = 0,
  completed = 0,
  pending = 0,
  needsReview = 0,
  total = 0,
}) {
  const [animatedPct, setAnimatedPct] = useState(0);

  // Subtle load/update animation for the stroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPct(percentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  const radius = 64;
  const circumference = 2 * Math.PI * radius;
  const safePercentage = Math.max(0, Math.min(100, animatedPct));
  const strokeDashoffset = circumference - (safePercentage / 100) * circumference;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-[#0F172A]/90 border border-slate-800/80 p-6 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.5)] backdrop-blur-md">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        {/* Left info & breakdown */}
        <div className="space-y-4 max-w-sm text-center md:text-left">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 border border-cyan-500/30 text-neon-cyan">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Compliance Health Index</span>
          </div>

          <div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
              Compliance Score
            </h3>
            <p className="mt-1 text-xs sm:text-sm text-cyan-300 font-mono font-medium">
              {total > 0
                ? `${completed} of ${total} requirements completed`
                : '0 of 0 requirements completed'}
            </p>
            <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
              Real-time fulfillment metric calculated directly from statutory obligations across all policy documents.
            </p>
          </div>

          {/* Breakdown pills */}
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111C32] border border-emerald-500/30 text-[11px] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e]" />
              {completed} Completed
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111C32] border border-amber-500/30 text-[11px] font-mono text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
              {pending} Pending
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111C32] border border-rose-500/30 text-[11px] font-mono text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_6px_#ef4444]" />
              {needsReview} Review
            </span>
          </div>
        </div>

        {/* Circular SVG Progress Meter */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-48 h-48 -rotate-90 transform" viewBox="0 0 160 160">
            {/* SVG Gradient definitions */}
            <defs>
              <linearGradient id="scoreNeonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00F5D4" />
                <stop offset="50%" stopColor="#00C2FF" />
                <stop offset="100%" stopColor="#7C3AED" />
              </linearGradient>
              <filter id="glowFilter" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background track circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="#1e293b"
              strokeWidth="10"
              fill="transparent"
              className="opacity-40"
            />

            {/* Glowing active arc */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="url(#scoreNeonGrad)"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              filter="url(#glowFilter)"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Center score readout */}
          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-black font-mono tracking-tight gradient-text-cyan">
              {Math.round(safePercentage)}%
            </span>
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-slate-400 mt-0.5">
              Compliance Score
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
