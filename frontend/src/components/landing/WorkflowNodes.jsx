import React from 'react';
import {
  FileText,
  Sparkles,
  CheckSquare,
  Zap,
  ShieldCheck,
  ArrowRight,
  Cpu,
} from 'lucide-react';

/**
 * Visual Representation of the PolicyLens Compliance Workflow
 * Connected glowing interactive nodes with animated pulse indicators
 */
export default function WorkflowNodes() {
  const nodes = [
    {
      id: 'doc',
      label: 'Policy Document',
      sub: 'PDF / Regulatory TXT',
      icon: FileText,
      accent: 'cyan',
      iconBg: 'bg-cyan-950/60 border-cyan-500/40 text-neon-cyan',
      badge: 'Step 01',
    },
    {
      id: 'ai',
      label: 'AI Analysis',
      sub: 'Clause Decomposition',
      icon: Sparkles,
      accent: 'purple',
      iconBg: 'bg-purple-950/60 border-purple-500/40 text-purple-300',
      badge: 'Step 02',
    },
    {
      id: 'req',
      label: 'Requirements',
      sub: 'Obligations & Scope',
      icon: CheckSquare,
      accent: 'blue',
      iconBg: 'bg-blue-950/60 border-blue-500/40 text-neon-blue',
      badge: 'Step 03',
    },
    {
      id: 'act',
      label: 'Actions',
      sub: 'Department Tasks',
      icon: Zap,
      accent: 'amber',
      iconBg: 'bg-amber-950/60 border-amber-500/40 text-neon-amber',
      badge: 'Step 04',
    },
    {
      id: 'comp',
      label: 'Compliance',
      sub: 'Audit-Ready Proof',
      icon: ShieldCheck,
      accent: 'emerald',
      iconBg: 'bg-emerald-950/60 border-emerald-500/40 text-neon-green',
      badge: 'Fulfillment',
    },
  ];

  return (
    <div className="relative w-full max-w-5xl mx-auto py-8">
      {/* Background ambient container glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-purple-500/5 to-emerald-500/5 rounded-3xl blur-xl" />

      <div className="relative rounded-2xl bg-[#0B1020]/80 border border-slate-800/80 p-6 md:p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
        {/* Visual Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-neon-cyan animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-slate-300">
              Autonomous Compliance Pipeline
            </span>
          </div>
          <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
            Real-Time Processing
          </span>
        </div>

        {/* Responsive Connected Nodes Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 relative">
          {nodes.map((node, index) => {
            const Icon = node.icon;
            const isLast = index === nodes.length - 1;

            return (
              <div key={node.id} className="relative flex flex-col items-center">
                {/* Connecting Line for desktop */}
                {!isLast && (
                  <div className="hidden lg:block absolute top-7 left-[65%] w-[70%] h-[2px] bg-gradient-to-r from-slate-700 via-cyan-500/50 to-slate-700 z-0">
                    <div className="absolute top-1/2 -translate-y-1/2 right-0 w-1.5 h-1.5 rounded-full bg-neon-cyan animate-ping" />
                  </div>
                )}

                {/* Node Card */}
                <div className="relative z-10 w-full flex flex-col items-center text-center p-4 rounded-xl bg-[#0F172A]/90 border border-slate-800 hover:border-cyan-500/40 transition-all duration-300 group hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,245,212,0.12)]">
                  {/* Badge */}
                  <span className="text-[10px] font-mono font-semibold uppercase text-slate-400 mb-2">
                    {node.badge}
                  </span>

                  {/* Icon with glowing ring */}
                  <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-3 shadow-inner ${node.iconBg} transition-transform group-hover:scale-110`}>
                    <Icon className="w-6 h-6" />
                  </div>

                  {/* Title & subtitle */}
                  <h4 className="text-sm font-bold text-white tracking-tight group-hover:text-neon-cyan transition-colors">
                    {node.label}
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-1 font-mono">
                    {node.sub}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
