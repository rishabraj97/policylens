import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

export default function Sidebar({ className = '' }) {
  const mainItems = [
    { label: 'Overview', to: '/dashboard', icon: LayoutDashboard },
    { label: 'Documents', to: '/documents', icon: FileText },
    { label: 'Policy Intelligence', to: '/analysis', icon: Sparkles },
    { label: 'Upload Policy', to: '/upload', icon: UploadCloud },
  ];

  return (
    <aside
      className={`w-64 shrink-0 bg-[#0B1020]/95 border-r border-slate-800/80 min-h-[calc(100vh-4rem)] p-4 flex flex-col justify-between backdrop-blur-md ${className}`}
    >
      <div className="space-y-6">
        <div>
          <p className="px-3 text-[11px] font-mono font-semibold tracking-widest text-slate-400 uppercase">
            Platform Matrix
          </p>
          <nav className="mt-3 space-y-1.5">
            {mainItems.map((item) => (
              <NavLink
                key={item.label}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                    isActive
                      ? 'bg-cyan-950/80 text-neon-cyan border border-cyan-500/30 shadow-[0_0_15px_rgba(0,245,212,0.18)] font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Quick upload card */}
        <div className="relative overflow-hidden p-4 rounded-2xl bg-gradient-to-br from-[#0F172A] to-[#111C32] border border-slate-800 shadow-lg">
          <div className="flex items-center gap-2 text-white font-semibold text-xs mb-1">
            <div className="p-1 rounded-md bg-cyan-950/80 text-neon-cyan border border-cyan-500/30">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span>AI Compliance Core</span>
          </div>
          <p className="mt-1.5 text-[11px] text-slate-400 leading-relaxed font-normal">
            Ingest statutory documents & extract actionable compliance tasks.
          </p>
          <NavLink
            to="/upload"
            className="mt-3.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-[#050816] bg-gradient-to-r from-neon-cyan to-neon-blue hover:shadow-[0_0_15px_rgba(0,245,212,0.4)] py-2 px-3 rounded-xl transition"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Upload New Policy</span>
          </NavLink>
        </div>
      </div>

      {/* Bottom Info */}
      <div className="pt-4 border-t border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <span>PolicyLens v1.0</span>
        <span className="inline-flex items-center gap-1 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_#22c55e]" />
          Production
        </span>
      </div>
    </aside>
  );
}

