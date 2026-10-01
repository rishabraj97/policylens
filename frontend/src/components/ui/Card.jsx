import React from 'react';

/**
 * Reusable Card container with dark cyber styling
 */
export default function Card({
  children,
  className = '',
  header,
  footer,
  padding = 'p-6',
}) {
  return (
    <div className={`bg-[#0F172A]/90 rounded-2xl border border-slate-800/80 shadow-[0_4px_24px_-2px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all ${className}`}>
      {header && (
        <div className="px-6 py-4 border-b border-slate-800/80 flex items-center justify-between">
          {header}
        </div>
      )}
      <div className={padding}>{children}</div>
      {footer && (
        <div className="px-6 py-3 border-t border-slate-800/80 bg-[#0B1020]/60 rounded-b-2xl">
          {footer}
        </div>
      )}
    </div>
  );
}

