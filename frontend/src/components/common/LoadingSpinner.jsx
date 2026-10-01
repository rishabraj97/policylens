import React from 'react';

/**
 * Reusable Loading Spinner component with glowing dual-orbital design
 */
export default function LoadingSpinner({
  size = 'md',
  className = '',
  color = 'text-neon-cyan',
  label = 'Processing...',
}) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-7 h-7',
    lg: 'w-10 h-10',
    xl: 'w-14 h-14',
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`} role="status">
      <div className={`relative ${sizeMap[size] || sizeMap.md}`}>
        {/* Outer pulsing ring */}
        <div className="absolute inset-0 rounded-full border-2 border-cyan-500/20 animate-ping opacity-40" />
        {/* Spinning gradient ring */}
        <svg
          className={`animate-spin ${sizeMap[size] || sizeMap.md} ${color}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-20"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="3"
          />
          <path
            className="opacity-90"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      {label && <span className="text-xs text-slate-400 font-medium tracking-wide">{label}</span>}
    </div>
  );
}

