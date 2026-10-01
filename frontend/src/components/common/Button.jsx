import React from 'react';

/**
 * Reusable Cyberpunk/B2B SaaS Button component for PolicyLens
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  className = '',
  icon: Icon,
  iconPosition = 'left',
  onClick,
  ...props
}) {
  const baseStyles =
    'relative inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#050816] disabled:opacity-50 disabled:cursor-not-allowed select-none overflow-hidden group active:scale-[0.98]';

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-neon-cyan via-[#00E5C9] to-neon-blue text-[#050816] font-semibold hover:shadow-[0_0_24px_rgba(0,245,212,0.45)] hover:brightness-105 border border-cyan-300/40 focus:ring-cyan-400',
    secondary:
      'bg-cyber-card/90 text-slate-200 border border-slate-700/80 hover:border-cyan-400/50 hover:bg-cyber-card-elevated hover:text-white hover:shadow-[0_0_15px_rgba(0,194,255,0.15)] focus:ring-slate-500',
    purple:
      'bg-gradient-to-r from-neon-purple via-[#6D28D9] to-indigo-600 text-white font-semibold hover:shadow-[0_0_24px_rgba(124,58,237,0.45)] hover:brightness-110 border border-purple-400/30 focus:ring-purple-500',
    outline:
      'bg-transparent text-neon-cyan border border-neon-cyan/50 hover:bg-neon-cyan/10 hover:border-neon-cyan hover:shadow-[0_0_16px_rgba(0,245,212,0.25)] focus:ring-cyan-400',
    ghost:
      'bg-transparent text-slate-300 hover:text-white hover:bg-slate-800/60 focus:ring-slate-500',
    danger:
      'bg-rose-950/60 text-rose-300 border border-rose-600/40 hover:bg-rose-900/60 hover:border-rose-500 hover:text-white hover:shadow-[0_0_18px_rgba(239,68,68,0.3)] focus:ring-rose-500',
  };

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-6 py-3 gap-2.5 font-semibold',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`${baseStyles} ${variantStyles[variant] || variantStyles.primary} ${sizeStyles[size] || sizeStyles.md} ${className}`}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-0.5 mr-2 h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-[-1px]" />
      ) : null}

      <span>{children}</span>

      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:translate-x-1" />
      )}
    </button>
  );
}

