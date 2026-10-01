import React from 'react';

/**
 * Premium GlowCard component with dark surface, subtle glow on hover, and optional gradient border
 */
export default function GlowCard({
  children,
  className = '',
  glowColor = 'cyan', // 'cyan' | 'blue' | 'purple' | 'emerald' | 'amber' | 'rose'
  elevated = false,
  interactive = false,
  onClick,
  ...props
}) {
  const glowBorderMap = {
    cyan: 'hover:border-cyan-400/40 hover:shadow-[0_0_25px_rgba(0,245,212,0.12)]',
    blue: 'hover:border-blue-400/40 hover:shadow-[0_0_25px_rgba(0,194,255,0.12)]',
    purple: 'hover:border-purple-400/40 hover:shadow-[0_0_25px_rgba(124,58,237,0.15)]',
    emerald: 'hover:border-emerald-400/40 hover:shadow-[0_0_25px_rgba(34,197,94,0.12)]',
    amber: 'hover:border-amber-400/40 hover:shadow-[0_0_25px_rgba(245,158,11,0.12)]',
    rose: 'hover:border-rose-400/40 hover:shadow-[0_0_25px_rgba(239,68,68,0.12)]',
  };

  return (
    <div
      onClick={onClick}
      className={`relative rounded-2xl border transition-all duration-200 ${
        elevated ? 'bg-[#111C32]/90' : 'bg-[#0F172A]/80'
      } backdrop-blur-md border-slate-800/80 ${
        interactive ? 'cursor-pointer ' + (glowBorderMap[glowColor] || glowBorderMap.cyan) + ' hover:-translate-y-0.5' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
