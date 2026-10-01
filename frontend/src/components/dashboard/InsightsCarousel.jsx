import React, { useState, useEffect } from 'react';
import { Sparkles, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, TrendingUp, Calendar } from 'lucide-react';

/**
 * Compact high-tech insight carousel / ticker for compliance alerts
 */
export default function InsightsCarousel() {
  const insights = [
    {
      id: 1,
      icon: Calendar,
      tag: 'Statutory Deadline',
      tagColor: 'text-amber-400 bg-amber-950/50 border-amber-500/30',
      text: '3 requirements have statutory compliance deadlines within the next 45 days.',
      action: 'View Deadlines',
    },
    {
      id: 2,
      icon: AlertTriangle,
      tag: 'Audit Review',
      tagColor: 'text-rose-400 bg-rose-950/50 border-rose-500/30',
      text: '2 requirements require updated cryptographic data destruction manifests.',
      action: 'Review Evidence',
    },
    {
      id: 3,
      icon: TrendingUp,
      tag: 'Readiness Metric',
      tagColor: 'text-neon-cyan bg-cyan-950/50 border-cyan-500/30',
      text: 'Overall organizational compliance readiness improved by 12% following recent updates.',
      action: 'Explore Trends',
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % insights.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [isPaused, insights.length]);

  const current = insights[currentIndex];
  const Icon = current.icon;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#0F172A] via-[#111C32] to-[#0F172A] border border-slate-800/80 p-4 shadow-sm"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 rounded-lg bg-purple-950/60 border border-purple-500/30 text-purple-300 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded-full border ${current.tagColor}`}>
                {current.tag}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                AI Compliance Intelligence
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-200 font-medium truncate">
              {current.text}
            </p>
          </div>
        </div>

        {/* Navigation controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev - 1 + insights.length) % insights.length)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
            aria-label="Previous insight"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-slate-500 px-1">
            {currentIndex + 1}/{insights.length}
          </span>
          <button
            type="button"
            onClick={() => setCurrentIndex((prev) => (prev + 1) % insights.length)}
            className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800/60 transition"
            aria-label="Next insight"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
