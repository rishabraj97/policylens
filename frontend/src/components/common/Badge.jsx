import React from 'react';

/**
 * Reusable Badge component for compliance statuses and tags
 */
export default function Badge({
  children,
  variant = 'default',
  size = 'md',
  dot = true,
  className = '',
}) {
  const normalized = String(children || variant).toLowerCase().replace(/\s+/g, '-');

  const variantStyles = {
    pending: 'bg-amber-950/40 text-amber-300 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.15)]',
    completed: 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30 shadow-[0_0_10px_rgba(34,197,94,0.15)]',
    'needs-review': 'bg-rose-950/40 text-rose-300 border-rose-500/30 shadow-[0_0_10px_rgba(239,68,68,0.15)]',
    info: 'bg-blue-950/40 text-blue-300 border-blue-500/30 shadow-[0_0_10px_rgba(0,194,255,0.15)]',
    cyan: 'bg-cyan-950/40 text-cyan-300 border-cyan-500/30 shadow-[0_0_10px_rgba(0,245,212,0.15)]',
    purple: 'bg-purple-950/40 text-purple-300 border-purple-500/30 shadow-[0_0_10px_rgba(124,58,237,0.15)]',
    default: 'bg-slate-800/60 text-slate-300 border-slate-700/60',
  };

  const dotStyles = {
    pending: 'bg-amber-400 shadow-[0_0_6px_#f59e0b]',
    completed: 'bg-emerald-400 shadow-[0_0_6px_#22c55e]',
    'needs-review': 'bg-rose-400 shadow-[0_0_6px_#ef4444]',
    info: 'bg-blue-400 shadow-[0_0_6px_#00c2ff]',
    cyan: 'bg-cyan-400 shadow-[0_0_6px_#00f5d4]',
    purple: 'bg-purple-400 shadow-[0_0_6px_#7c3aed]',
    default: 'bg-slate-400',
  };

  const currentVariant = variantStyles[normalized] || variantStyles[variant] || variantStyles.default;
  const currentDot = dotStyles[normalized] || dotStyles[variant] || dotStyles.default;

  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs font-medium px-2.5 py-1',
    lg: 'text-xs font-semibold px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border ${currentVariant} ${sizeStyles[size] || sizeStyles.md} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${currentDot}`} />}
      <span>{children}</span>
    </span>
  );
}

