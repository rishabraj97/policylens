import React from 'react';

/**
 * StatCard component for dashboard metrics with neon accents
 */
export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'cyan',
  trend,
}) {
  const variantMap = {
    cyan: {
      iconBg: 'bg-cyan-950/60 text-neon-cyan border border-cyan-500/30 shadow-[0_0_12px_rgba(0,245,212,0.2)]',
      borderGlow: 'hover:border-cyan-500/40 hover:shadow-[0_0_20px_rgba(0,245,212,0.1)]',
      valueColor: 'text-white',
    },
    blue: {
      iconBg: 'bg-blue-950/60 text-neon-blue border border-blue-500/30 shadow-[0_0_12px_rgba(0,194,255,0.2)]',
      borderGlow: 'hover:border-blue-500/40 hover:shadow-[0_0_20px_rgba(0,194,255,0.1)]',
      valueColor: 'text-white',
    },
    purple: {
      iconBg: 'bg-purple-950/60 text-purple-300 border border-purple-500/30 shadow-[0_0_12px_rgba(124,58,237,0.2)]',
      borderGlow: 'hover:border-purple-500/40 hover:shadow-[0_0_20px_rgba(124,58,237,0.1)]',
      valueColor: 'text-white',
    },
    amber: {
      iconBg: 'bg-amber-950/60 text-neon-amber border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.2)]',
      borderGlow: 'hover:border-amber-500/40 hover:shadow-[0_0_20px_rgba(245,158,11,0.1)]',
      valueColor: 'text-white',
    },
    emerald: {
      iconBg: 'bg-emerald-950/60 text-neon-green border border-emerald-500/30 shadow-[0_0_12px_rgba(34,197,94,0.2)]',
      borderGlow: 'hover:border-emerald-500/40 hover:shadow-[0_0_20px_rgba(34,197,94,0.1)]',
      valueColor: 'text-white',
    },
    rose: {
      iconBg: 'bg-rose-950/60 text-neon-rose border border-rose-500/30 shadow-[0_0_12px_rgba(239,68,68,0.2)]',
      borderGlow: 'hover:border-rose-500/40 hover:shadow-[0_0_20px_rgba(239,68,68,0.1)]',
      valueColor: 'text-white',
    },
  };

  const style = variantMap[variant] || variantMap.cyan;

  return (
    <div className={`bg-[#0F172A]/90 rounded-2xl border border-slate-800/80 p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.4)] backdrop-blur-md transition-all duration-200 hover:-translate-y-0.5 ${style.borderGlow}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-400">
          {title}
        </span>
        {Icon && (
          <div className={`p-2.5 rounded-xl ${style.iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span className={`text-3xl font-bold font-mono tracking-tight ${style.valueColor}`}>
          {value}
        </span>
        {trend && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 font-mono">
            {trend}
          </span>
        )}
      </div>
      {subtitle && (
        <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">{subtitle}</p>
      )}
    </div>
  );
}

