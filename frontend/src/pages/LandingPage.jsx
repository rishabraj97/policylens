import React from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldCheck,
  FileText,
  CheckCircle2,
  Calendar,
  Building2,
  ArrowRight,
  UploadCloud,
  FileCheck,
  Layers,
  Sparkles,
  Zap,
  Lock,
  Search,
  Check,
  Clock,
} from 'lucide-react';
import Button from '../components/common/Button';
import WorkflowNodes from '../components/landing/WorkflowNodes';
import FeatureSlider from '../components/landing/FeatureSlider';

export default function LandingPage() {
  const featureCards = [
    {
      icon: Sparkles,
      title: 'AI Requirement Extraction',
      description: 'Decompose dense regulatory clauses and contracts into atomic compliance obligations with high confidence scoring.',
      accent: 'purple',
      iconBg: 'bg-purple-950/60 border-purple-500/30 text-purple-300',
    },
    {
      icon: Zap,
      title: 'Actionable Compliance Tasks',
      description: 'Transform passive legal language into unambiguous operational instructions and deliverables for execution teams.',
      accent: 'cyan',
      iconBg: 'bg-cyan-950/60 border-cyan-500/30 text-neon-cyan',
    },
    {
      icon: Calendar,
      title: 'Deadline & Timeline Detection',
      description: 'Automatically extract statutory enforcement dates, annual audit milestones, and scheduled compliance review windows.',
      accent: 'amber',
      iconBg: 'bg-amber-950/60 border-amber-500/30 text-neon-amber',
    },
    {
      icon: Building2,
      title: 'Responsible Team Mapping',
      description: 'Route obligations directly to Legal, IT Security, HR, Finance, or Operations with clear organizational accountability.',
      accent: 'blue',
      iconBg: 'bg-blue-950/60 border-blue-500/30 text-neon-blue',
    },
    {
      icon: FileCheck,
      title: 'Evidence Tracking & Audits',
      description: 'Define specific documentary proof and manifests required before external regulators and SOC2 auditors request verification.',
      accent: 'emerald',
      iconBg: 'bg-emerald-950/60 border-emerald-500/30 text-neon-green',
    },
    {
      icon: Search,
      title: 'Document Scope & Page References',
      description: 'Retain page-exact source provenance for every requirement with instant clickable page anchors and audit citations.',
      accent: 'cyan',
      iconBg: 'bg-cyan-950/60 border-cyan-500/30 text-neon-cyan',
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#050816] text-slate-100 relative overflow-hidden">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 cyber-grid opacity-60 pointer-events-none" />

      {/* ------------------------------------------------------------------ */}
      {/* HERO SECTION                                                       */}
      {/* ------------------------------------------------------------------ */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 border-b border-slate-800/80">
        {/* Radial Hero Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[500px] bg-gradient-to-tr from-cyan-500/10 via-purple-500/10 to-blue-500/10 rounded-full blur-[140px] pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-mono font-semibold bg-[#0F172A]/90 text-neon-cyan border border-cyan-500/40 shadow-[0_0_15px_rgba(0,245,212,0.2)] mb-8 animate-fadeIn">
            <span className="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_8px_#00F5D4] animate-pulse" />
            <span>AI-POWERED COMPLIANCE INTELLIGENCE</span>
          </div>

          {/* Main Heading */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-white leading-[1.12]">
            Turn complicated policies into{' '}
            <span className="gradient-text-cyan drop-shadow-[0_0_30px_rgba(0,245,212,0.35)]">
              actionable compliance
            </span>.
          </h1>

          {/* Supporting Text */}
          <p className="mt-6 text-base sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Upload regulations, policies, contracts and notifications. PolicyLens transforms complex
            requirements into clear, trackable compliance actions.
          </p>

          {/* CTA Buttons */}
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/upload" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto px-8 py-3.5 text-base shadow-[0_0_25px_rgba(0,245,212,0.4)] hover:shadow-[0_0_35px_rgba(0,245,212,0.6)]"
                icon={UploadCloud}
              >
                Upload a Policy
              </Button>
            </Link>

            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto px-8 py-3.5 text-base"
                icon={ArrowRight}
                iconPosition="right"
              >
                Explore Dashboard
              </Button>
            </Link>
          </div>

          {/* Micro trust indicators */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-y-3 gap-x-8 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-neon-cyan" />
              <span>Handles Regulations, Policies & Contracts</span>
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-neon-cyan" />
              <span>Automated Requirement Decomposition</span>
            </span>
            <span className="flex items-center gap-2">
              <Check className="w-4 h-4 text-neon-cyan" />
              <span>Enterprise SOC2 & Audit Readiness</span>
            </span>
          </div>

          {/* Workflow Interactive Visual Diagram */}
          <div className="mt-14">
            <WorkflowNodes />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* WORKFLOW / LIFECYCLE SLIDER SECTION                                 */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-20 md:py-28 relative z-10 border-b border-slate-800/80 bg-[#0B1020]/40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <FeatureSlider />
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FEATURE CARDS GRID SECTION                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-20 md:py-28 relative z-10 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-950/80 text-neon-cyan border border-cyan-500/30 mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>COMPLIANCE INTELLIGENCE ARCHITECTURE</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              Precision Intelligence for Every Regulatory Clause
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
              Designed for legal counsels, security officers, and compliance executives who require absolute operational clarity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featureCards.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="group p-6 rounded-2xl bg-[#0F172A]/80 border border-slate-800/80 hover:border-cyan-500/40 transition-all duration-300 backdrop-blur-md hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(0,245,212,0.12)] flex flex-col justify-between"
                >
                  <div>
                    <div className={`w-12 h-12 rounded-xl border flex items-center justify-center mb-5 ${feat.iconBg} transition-transform group-hover:scale-105`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-white group-hover:text-neon-cyan transition-colors">
                      {feat.title}
                    </h3>
                    <p className="mt-2.5 text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                      {feat.description}
                    </p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between text-xs font-mono text-slate-500 group-hover:text-cyan-400 transition-colors">
                    <span>Autonomous Engine</span>
                    <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* CTA BANNER                                                         */}
      {/* ------------------------------------------------------------------ */}
      <section className="py-20 bg-gradient-to-b from-[#0B1020] to-[#050816] relative overflow-hidden">
        <div className="ambient-glow w-96 h-96 bg-cyan-500/15 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/80 border border-cyan-500/40 text-neon-cyan flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(0,245,212,0.3)]">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Ready to streamline your regulatory compliance?
          </h2>
          <p className="mt-4 text-slate-300 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Upload your first policy document and preview automated requirement decomposition in under 30 seconds.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/upload" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="w-full sm:w-auto px-8 py-3.5 text-base"
                icon={UploadCloud}
              >
                Upload Document Now
              </Button>
            </Link>
            <Link to="/dashboard" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto px-8 py-3.5 text-base"
              >
                View Live Matrix
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* FOOTER                                                             */}
      {/* ------------------------------------------------------------------ */}
      <footer className="mt-auto py-8 bg-[#050816] border-t border-slate-800/80 text-xs text-slate-500 font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-neon-cyan" />
            <span>© {new Date().getFullYear()} PolicyLens. Turn complicated policies into actionable compliance.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link to="/upload" className="hover:text-neon-cyan transition-colors">Upload</Link>
            <Link to="/dashboard" className="hover:text-neon-cyan transition-colors">Dashboard</Link>
            <Link to="/analysis" className="hover:text-neon-cyan transition-colors">Analysis Engine</Link>
            <Link to="/login" className="hover:text-neon-cyan transition-colors">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

