import React from 'react';
import { Layers } from 'lucide-react';

/**
 * Compact SVG/CSS Status Distribution visualization (Section 5)
 * Shows Completed, Pending, and Needs Review ratio with real-time updates.
 */
export default function StatusDistribution({
  total = 0,
  completed = 0,
  pending = 0,
  needsReview = 0,
}) {
  const safeTotal = total > 0 ? total : 1;
  const completedPct = total > 0 ? ((completed / safeTotal) * 100).toFixed(1) : 0;
  const pendingPct = total > 0 ? ((pending / safeTotal) * 100).toFixed(1) : 0;
  const reviewPct = total > 0 ? ((needsReview / safeTotal) * 100).toFixed(1) : 0;

  return (
    <div className="rounded-3xl bg-[#0F172A]/90 border border-slate-800/80 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-neon-cyan">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Status Distribution
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              Live ratio of active compliance workflows
            </p>
          </div>
        </div>

        <span className="text-xs font-mono font-semibold text-slate-400">
          {total} Total
        </span>
      </div>

      {/* Segmented Multi-color Bar */}
      <div className="h-4 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex shadow-inner">
        {completed > 0 && (
          <div
            style={{ width: `${completedPct}%` }}
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700 ease-out shadow-[0_0_10px_#22c55e]"
            title={`Completed: ${completed} (${completedPct}%)`}
          />
        )}
        {pending > 0 && (
          <div
            style={{ width: `${pendingPct}%` }}
            className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700 ease-out shadow-[0_0_10px_#f59e0b]"
            title={`Pending: ${pending} (${pendingPct}%)`}
          />
        )}
        {needsReview > 0 && (
          <div
            style={{ width: `${reviewPct}%` }}
            className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-500 to-rose-500 transition-all duration-700 ease-out shadow-[0_0_10px_#a855f7]"
            title={`Needs Review: ${needsReview} (${reviewPct}%)`}
          />
        )}
        {total === 0 && (
          <div className="h-full w-full bg-slate-800/40 text-[10px] font-mono text-slate-500 flex items-center justify-center">
            No data
          </div>
        )}
      </div>

      {/* Legend & Count Breakdown */}
      <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-slate-800/60 text-xs">
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e]" />
            <span>Completed</span>
          </div>
          <span className="text-base font-bold font-mono text-white mt-0.5">
            {completed} <span className="text-[11px] text-slate-500 font-normal">({completedPct}%)</span>
          </span>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_#f59e0b]" />
            <span>Pending</span>
          </div>
          <span className="text-base font-bold font-mono text-white mt-0.5">
            {pending} <span className="text-[11px] text-slate-500 font-normal">({pendingPct}%)</span>
          </span>
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-purple-400 font-mono text-[11px] font-semibold">
            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-[0_0_6px_#a855f7]" />
            <span>Needs Review</span>
          </div>
          <span className="text-base font-bold font-mono text-white mt-0.5">
            {needsReview} <span className="text-[11px] text-slate-500 font-normal">({reviewPct}%)</span>
          </span>
        </div>
      </div>
    </div>
  );
}
