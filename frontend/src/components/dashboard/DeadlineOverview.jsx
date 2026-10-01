import React from 'react';
import { CalendarClock, AlertCircle, Clock, Calendar, HelpCircle } from 'lucide-react';
import { OVERDUE, DUE_SOON, UPCOMING, NO_DEADLINE } from '../../utils/deadline';

/**
 * Deadline Overview Card (Section 6 & 7)
 * Displays deterministic deadline categories:
 * - Overdue (red)
 * - Due Soon (amber)
 * - Upcoming (cyan)
 * - No Deadline (muted)
 * Clicking any card toggles or applies the deadline filter in the requirements matrix.
 */
export default function DeadlineOverview({
  overdue = 0,
  dueSoon = 0,
  upcoming = 0,
  noDeadline = 0,
  activeFilter = null,
  onSelectFilter = () => {},
}) {
  const categories = [
    {
      id: OVERDUE,
      label: 'Overdue',
      count: overdue,
      desc: 'Action required immediately',
      icon: AlertCircle,
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-950/40',
      borderColor: 'border-rose-500/30 hover:border-rose-400',
      glow: 'shadow-[0_0_15px_rgba(239,68,68,0.15)]',
      indicator: 'bg-rose-400 shadow-[0_0_8px_#ef4444]',
      badgeBg: 'bg-rose-950/80 border-rose-500/40 text-rose-300',
    },
    {
      id: DUE_SOON,
      label: 'Due Soon',
      count: dueSoon,
      desc: 'Deliverable within 7 days',
      icon: Clock,
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-950/40',
      borderColor: 'border-amber-500/30 hover:border-amber-400',
      glow: 'shadow-[0_0_15px_rgba(245,158,11,0.15)]',
      indicator: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
      badgeBg: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
    },
    {
      id: UPCOMING,
      label: 'Upcoming',
      count: upcoming,
      desc: 'Future statutory milestones',
      icon: Calendar,
      textColor: 'text-cyan-400',
      bgColor: 'bg-cyan-950/40',
      borderColor: 'border-cyan-500/30 hover:border-cyan-400',
      glow: 'shadow-[0_0_15px_rgba(0,245,212,0.15)]',
      indicator: 'bg-cyan-400 shadow-[0_0_8px_#00F5D4]',
      badgeBg: 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300',
    },
    {
      id: NO_DEADLINE,
      label: 'No Deadline',
      count: noDeadline,
      desc: 'Unspecified or standing policy',
      icon: HelpCircle,
      textColor: 'text-slate-400',
      bgColor: 'bg-[#0B1020]/60',
      borderColor: 'border-slate-800 hover:border-slate-700',
      glow: '',
      indicator: 'bg-slate-500',
      badgeBg: 'bg-slate-900 border-slate-700/80 text-slate-400',
    },
  ];

  return (
    <div className="rounded-3xl bg-[#0F172A]/90 border border-slate-800/80 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-neon-cyan">
            <CalendarClock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Deadline &amp; Risk Overview
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              Deterministic date categorization across organizational deliverables
            </p>
          </div>
        </div>

        {activeFilter && (
          <button
            onClick={() => onSelectFilter(null)}
            className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline self-start sm:self-auto"
          >
            Clear deadline filter
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {categories.map((cat) => {
          const isSelected = activeFilter === cat.id;
          const Icon = cat.icon;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectFilter(isSelected ? null : cat.id)}
              className={`text-left p-4 rounded-2xl border transition-all duration-200 relative group overflow-hidden ${
                cat.bgColor
              } ${cat.borderColor} ${
                isSelected
                  ? 'ring-2 ring-neon-cyan shadow-[0_0_20px_rgba(0,245,212,0.25)] border-cyan-400'
                  : ''
              }`}
            >
              {/* Subtle top indicator line */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${cat.indicator}`} />
                  <span className={`text-xs font-mono font-bold uppercase tracking-wider ${cat.textColor}`}>
                    {cat.label}
                  </span>
                </div>
                <Icon className={`w-4 h-4 ${cat.textColor} opacity-60 group-hover:opacity-100 transition-opacity`} />
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold font-mono tracking-tight text-white">
                  {cat.count}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {cat.count === 1 ? 'obligation' : 'obligations'}
                </span>
              </div>

              <p className="mt-1 text-[11px] text-slate-400 truncate">
                {cat.desc}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
