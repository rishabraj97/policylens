import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  Clock,
  Building2,
  FileCheck,
  ArrowRight,
  Sparkles,
  BookOpen,
  Layers,
  UploadCloud,
  Hash,
  Type,
  FileCode,
  AlertCircle,
  Loader2,
  ShieldCheck,
  XCircle,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  BarChart2,
  Cpu,
  ExternalLink,
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Button from '../components/common/Button';
import GlowCard from '../components/common/GlowCard';
import Badge from '../components/common/Badge';
import api from '../services/api';

// ---------------------------------------------------------------------------
// Default sample data used if user navigates directly to /analysis
// ---------------------------------------------------------------------------
const FALLBACK_DOCUMENT = {
  filename: 'sample_digital_governance_policy.pdf',
  file_type: 'pdf',
  file_size: 1562,
  total_pages: 2,
  character_count: 410,
  word_count: 56,
};

const FALLBACK_CONTENT = [
  {
    page: 1,
    text: `PolicyLens Synthetic Regulation - Page 1
Section 1: Data Privacy
Organizations processing personal data must maintain an updated privacy notice.
The Legal Department is responsible for maintaining the notice.
All public-facing privacy notices must be audited every six months.`,
  },
  {
    page: 2,
    text: `PolicyLens Synthetic Regulation - Page 2
Section 2: Security Audits
Annual multi-factor authentication audit across all production access accounts.
Audits must be completed before October 15th annually.
The IT Security team is required to submit compliance evidence to executive management.`,
  },
];

// ---------------------------------------------------------------------------
// Pipeline stages
// ---------------------------------------------------------------------------
const PIPELINE_STAGES = [
  { id: 1, key: 'uploaded', label: 'Document received' },
  { id: 2, key: 'extracted', label: 'Text extracted' },
  { id: 3, key: 'analysing', label: 'Analysing requirements' },
  { id: 4, key: 'identifying', label: 'Identifying obligations' },
  { id: 5, key: 'mapping', label: 'Mapping actions' },
  { id: 6, key: 'structuring', label: 'Structuring compliance data' },
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------
const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const confidencePct = (v) => Math.round((v || 0) * 100);

const confidenceColor = (pct) => {
  if (pct >= 80) return 'text-emerald-400';
  if (pct >= 60) return 'text-amber-400';
  return 'text-rose-400';
};

const confidenceBg = (pct) => {
  if (pct >= 80) return 'bg-emerald-400 shadow-[0_0_8px_#22c55e]';
  if (pct >= 60) return 'bg-amber-400 shadow-[0_0_8px_#f59e0b]';
  return 'bg-rose-400 shadow-[0_0_8px_#ef4444]';
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function PipelineStatus({ analysisState }) {
  const getStageStatus = (key) => {
    if (analysisState === 'idle') {
      return key === 'uploaded' || key === 'extracted' ? 'done' : 'pending';
    }
    if (analysisState === 'analysing') {
      if (key === 'uploaded' || key === 'extracted') return 'done';
      if (key === 'analysing' || key === 'identifying') return 'active';
      return 'pending';
    }
    if (analysisState === 'structuring') {
      if (key === 'uploaded' || key === 'extracted' || key === 'analysing' || key === 'identifying') return 'done';
      if (key === 'mapping' || key === 'structuring') return 'active';
      return 'pending';
    }
    if (analysisState === 'success') {
      return 'done';
    }
    if (analysisState === 'error') {
      if (key === 'uploaded' || key === 'extracted') return 'done';
      return 'error';
    }
    return 'pending';
  };

  return (
    <div className="mb-8 p-5 rounded-2xl bg-[#0F172A]/90 border border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950 text-neon-cyan border border-cyan-500/30">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-300">
              Policy Intelligence Engine Pipeline
            </h3>
          </div>
        </div>

        {analysisState === 'success' && (
          <span className="text-xs font-mono font-bold text-emerald-300 bg-emerald-950/80 px-3 py-1 rounded-full border border-emerald-500/40 shadow-[0_0_12px_rgba(34,197,94,0.25)] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Analysis Complete
          </span>
        )}
        {(analysisState === 'analysing' || analysisState === 'structuring') && (
          <span className="text-xs font-mono font-bold text-neon-cyan bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-500/40 shadow-[0_0_12px_rgba(0,245,212,0.25)] flex items-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-neon-cyan" />
            Processing Engine Active...
          </span>
        )}
        {analysisState === 'idle' && (
          <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800/60 px-3 py-1 rounded-full border border-slate-700/60">
            Ready for AI Execution
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {PIPELINE_STAGES.map((step) => {
          const s = getStageStatus(step.key);
          return (
            <div
              key={step.id}
              className={`p-3 rounded-xl border transition-all duration-300 ${
                s === 'done'
                  ? 'border-emerald-500/30 bg-emerald-950/30 text-emerald-200'
                  : s === 'active'
                  ? 'border-cyan-500/50 bg-cyan-950/40 text-cyan-200 shadow-[0_0_15px_rgba(0,245,212,0.15)] ring-1 ring-cyan-400/40'
                  : s === 'error'
                  ? 'border-rose-500/40 bg-rose-950/40 text-rose-200'
                  : 'border-slate-800/80 bg-[#0B1020]/60 text-slate-500'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {s === 'done' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : s === 'active' ? (
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-neon-cyan border-t-transparent animate-spin shrink-0" />
                ) : s === 'error' ? (
                  <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0" />
                )}
                <span className="text-[10px] font-mono font-bold uppercase text-slate-400">
                  Step 0{step.id}
                </span>
              </div>
              <p className="text-xs font-semibold leading-tight">{step.label}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RequirementCard({ req, index }) {
  const [expanded, setExpanded] = useState(false);
  const pct = confidencePct(req.confidence);

  return (
    <div className="group rounded-2xl bg-[#0F172A]/90 border border-slate-800/80 hover:border-slate-700 transition-all duration-300 shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur-md overflow-hidden">
      {/* Card header */}
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-neon-cyan flex items-center justify-center text-xs font-mono font-bold shrink-0 shadow-[0_0_10px_rgba(0,245,212,0.15)]">
              {String(index + 1).padStart(2, '0')}
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">
                REQUIREMENT {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white leading-snug mt-0.5">
                {req.requirement}
              </h3>
            </div>
          </div>

          {/* Status badge */}
          <div className="shrink-0 self-start">
            <Badge variant={req.status}>{req.status}</Badge>
          </div>
        </div>

        {/* Action Callout Box */}
        <div className="flex items-start gap-3 mb-4 p-3.5 rounded-xl bg-[#111C32] border border-slate-700/70">
          <Target className="w-4 h-4 text-neon-cyan shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 mb-0.5">
              ACTION INSTRUCTION
            </p>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
              {req.action}
            </p>
          </div>
        </div>

        {/* Quick Info Grid / Pills */}
        <div className="flex flex-wrap items-center gap-2.5 mb-4">
          {/* Source Page Pill (Clickable style reference) */}
          <div
            title="View source page in extracted text preview"
            onClick={() => {
              const pageNum = req.source_pages?.[0] || 1;
              const el = document.getElementById(`page-block-${pageNum}`);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }}
            className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-mono hover:border-indigo-400 hover:text-white transition shadow-sm"
          >
            <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
            <span>
              {req.source_pages?.length === 1
                ? `Page ${req.source_pages[0]}`
                : `Pages ${req.source_pages?.join(', ')}`}
            </span>
          </div>

          {/* AI Confidence */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#111C32] border border-slate-700 text-xs font-mono">
            <Zap className={`w-3.5 h-3.5 ${confidenceColor(pct)}`} />
            <span className="text-slate-400">AI Confidence:</span>
            <span className={`font-bold ${confidenceColor(pct)}`}>{pct}%</span>
          </div>

          {/* Department */}
          {req.responsible_department && req.responsible_department !== 'Not specified' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#111C32] border border-slate-700 text-xs font-mono text-slate-300">
              <Building2 className="w-3.5 h-3.5 text-slate-400" />
              <span>{req.responsible_department}</span>
            </div>
          )}

          {/* Deadline */}
          {req.deadline && req.deadline !== 'Not specified' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-950/50 border border-amber-500/30 text-amber-300 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>{req.deadline}</span>
            </div>
          )}
        </div>

        {/* AI Confidence Meter Bar */}
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
            <span>AI Calibration Metric</span>
            <span className={`font-bold ${confidenceColor(pct)}`}>{pct}% confidence</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${confidenceBg(pct)}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-neon-cyan transition mt-2"
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          <span>{expanded ? 'Hide detail parameters' : 'Show full audit parameters & evidence'}</span>
        </button>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-800/80 bg-[#0B1020]/80 p-5 sm:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fadeIn">
          <DetailField icon={ShieldCheck} label="Applicability" value={req.applicability} />
          <DetailField icon={Building2} label="Responsible Department" value={req.responsible_department || 'Not specified'} />
          <DetailField icon={Clock} label="Deadline" value={req.deadline || 'Not specified'} />
          <DetailField icon={FileCheck} label="Evidence Required" value={req.evidence_required || 'Not specified'} />
          <div className="sm:col-span-2">
            <DetailField
              icon={BookOpen}
              label="Source Provenance"
              value={
                req.source_pages?.length === 1
                  ? `Page ${req.source_pages[0]}`
                  : `Pages ${req.source_pages?.join(', ')}`
              }
              highlight
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DetailField({ icon: Icon, label, value, highlight }) {
  return (
    <div
      className={`rounded-xl p-3.5 border ${
        highlight
          ? 'bg-indigo-950/40 border-indigo-500/30 text-white'
          : 'bg-[#0F172A] border-slate-800 text-slate-200'
      }`}
    >
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className={`w-3.5 h-3.5 ${highlight ? 'text-indigo-400' : 'text-slate-400'}`} />
        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
          {label}
        </span>
      </div>
      <p className={`text-xs sm:text-sm font-medium ${value === 'Not specified' ? 'text-slate-500 italic' : 'text-slate-200'}`}>
        {value}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AnalysisPage
// ---------------------------------------------------------------------------

export default function AnalysisPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const isRealUpload = Boolean(location.state?.document && location.state?.content);
  const documentInfo = location.state?.document || FALLBACK_DOCUMENT;
  const pages = location.state?.content || FALLBACK_CONTENT;

  const [activePageTab, setActivePageTab] = useState(1);

  // AI analysis state
  // 'idle' | 'analysing' | 'structuring' | 'success' | 'error'
  const [analysisState, setAnalysisState] = useState('idle');
  const [analysisError, setAnalysisError] = useState('');
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleRunAnalysis = async () => {
    if (!pages || pages.length === 0) {
      setAnalysisError('No document pages available. Please upload a document first.');
      setAnalysisState('error');
      return;
    }

    try {
      setAnalysisError('');
      setAnalysisResult(null);
      setAnalysisState('analysing');

      // Stage 3 — send extracted page texts to real AI service and persist
      const result = await api.analyzeDocument(
        pages,
        documentInfo.filename,
        documentInfo.id,
        documentInfo.content_hash
      );

      // Stage 4 — brief structuring pipeline presentation
      setAnalysisState('structuring');
      await new Promise((r) => setTimeout(r, 700));


      setAnalysisResult(result);
      setAnalysisState('success');

      // Step 6: Auto-index document for PolicyLens AI (RAG) in the background
      // Use the document_id returned from the analysis result
      const docId = result?.document_id || documentInfo?.id;
      if (docId && pages && pages.length > 0) {
        api.indexDocumentForRAG(docId, pages).catch((err) => {
          console.warn('[PolicyLens AI] RAG indexing failed (non-critical):', err.message);
        });
      }
    } catch (err) {
      setAnalysisState('error');
      setAnalysisError(err.message || 'AI analysis failed. Please verify the backend and AI credentials.');
    }
  };

  const isAnalysing = analysisState === 'analysing' || analysisState === 'structuring';

  return (
    <PageContainer maxWidth="max-w-5xl">
      {/* Ambient background lighting */}
      <div className="ambient-glow w-96 h-96 bg-purple-500/10 top-1/4 right-1/4 pointer-events-none" />

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 mb-3 shadow-[0_0_12px_rgba(34,197,94,0.2)]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Document Ingested &amp; Normalized</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white break-words">
            {documentInfo.filename}
          </h1>
          <p className="mt-1 text-xs sm:text-sm font-mono text-slate-400">
            {isRealUpload ? (
              <span className="text-emerald-400 font-medium">
                Live extraction from uploaded file ({documentInfo.file_type.toUpperCase()})
              </span>
            ) : (
              <span>Viewing default demonstration document</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <Link to="/upload">
            <Button variant="secondary" size="md" icon={UploadCloud}>
              Upload Another
            </Button>
          </Link>
          {analysisState === 'success' && analysisResult?.document_id && (
            <Link to={`/documents/${analysisResult.document_id}/chat`}>
              <Button
                variant="secondary"
                size="md"
                icon={Sparkles}
                className="border-cyan-500/40 text-neon-cyan hover:border-cyan-400"
              >
                PolicyLens AI
              </Button>
            </Link>
          )}
          {analysisState === 'success' && (
            <Button
              variant="primary"
              size="md"
              onClick={() => navigate('/dashboard')}
              icon={ArrowRight}
              iconPosition="right"
              className="font-bold"
            >
              View Dashboard
            </Button>
          )}
        </div>
      </div>

      {/* Pipeline Status */}
      <PipelineStatus analysisState={analysisState} />

      {/* Extracted Document Metadata Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 relative z-10">
        <div className="bg-[#0F172A]/90 rounded-2xl border border-slate-800/80 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Pages Extracted</span>
            <Layers className="w-4 h-4 text-neon-cyan" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">{documentInfo.total_pages}</p>
          <span className="text-[11px] font-mono text-slate-500">Preserved boundaries</span>
        </div>

        <div className="bg-[#0F172A]/90 rounded-2xl border border-slate-800/80 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Word Count</span>
            <Type className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">
            {documentInfo.word_count?.toLocaleString()}
          </p>
          <span className="text-[11px] font-mono text-slate-500">Extracted lexical units</span>
        </div>

        <div className="bg-[#0F172A]/90 rounded-2xl border border-slate-800/80 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>Characters</span>
            <Hash className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">
            {documentInfo.character_count?.toLocaleString()}
          </p>
          <span className="text-[11px] font-mono text-slate-500">UTF-8 Normalized</span>
        </div>

        <div className="bg-[#0F172A]/90 rounded-2xl border border-slate-800/80 p-4 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between text-xs font-mono text-slate-400">
            <span>File Size &amp; Format</span>
            <FileCode className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-2xl font-bold font-mono text-white mt-1">
            {formatFileSize(documentInfo.file_size)}
          </p>
          <span className="text-[11px] font-mono uppercase text-cyan-400 font-bold">
            {documentInfo.file_type} Format
          </span>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* AI Analysis CTA / Loading / Results                                 */}
      {/* ------------------------------------------------------------------ */}

      {/* Idle state — CTA to start analysis */}
      {analysisState === 'idle' && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-purple-950/50 via-[#111C32] to-cyan-950/50 border border-purple-500/40 flex flex-col sm:flex-row items-center justify-between gap-6 mb-8 shadow-[0_8px_32px_rgba(124,58,237,0.15)] relative z-10">
          <div>
            <h4 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
              <span>AI Compliance Decomposition Engine Ready</span>
            </h4>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl leading-relaxed">
              Deconstruct this policy with AI to extract actionable obligations, assign departmental owners, detect deadlines, and compile evidence deliverables.
            </p>
          </div>
          <Button
            variant="purple"
            size="lg"
            onClick={handleRunAnalysis}
            icon={Sparkles}
            className="shrink-0 px-6 py-3 font-bold shadow-[0_0_20px_rgba(124,58,237,0.4)]"
          >
            Analyse Requirements
          </Button>
        </div>
      )}

      {/* Loading state */}
      {isAnalysing && (
        <div className="mb-8 p-10 rounded-3xl bg-[#0F172A]/90 border border-purple-500/40 shadow-[0_0_30px_rgba(124,58,237,0.2)] flex flex-col items-center gap-4 text-center relative z-10">
          <div className="w-16 h-16 rounded-2xl bg-purple-950/80 border border-purple-500/40 flex items-center justify-center shadow-[0_0_20px_rgba(124,58,237,0.3)]">
            <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-white">
              {analysisState === 'analysing' ? 'AI is analysing compliance requirements…' : 'Structuring actionable matrix…'}
            </h4>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-md">
              {analysisState === 'analysing'
                ? 'Parsing clauses, isolating statutory obligations, and evaluating department scope.'
                : 'Validating output matrix schema and audit proofs.'}
            </p>
          </div>
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2.5 h-2.5 rounded-full bg-neon-cyan animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Error state */}
      {analysisState === 'error' && (
        <div className="mb-8 p-5 rounded-2xl bg-rose-950/60 border border-rose-500/40 flex items-start gap-4 text-rose-200 relative z-10 shadow-lg">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-sm font-bold text-rose-300">Analysis Pipeline Notice</h4>
            <p className="text-xs sm:text-sm text-rose-200 mt-0.5">{analysisError}</p>
            <p className="text-xs text-rose-400 mt-2 font-mono">
              Ensure the FastAPI backend is running and AI_API_KEY is configured in your environment.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={handleRunAnalysis}>
            Retry Analysis
          </Button>
        </div>
      )}

      {/* Success — Analysis Results */}
      {analysisState === 'success' && analysisResult && (
        <div className="mb-8 space-y-6 relative z-10">
          {/* Summary card */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-[#0F172A] to-cyan-950/40 border border-emerald-500/40 shadow-[0_8px_32px_rgba(34,197,94,0.15)]">
            <div className="flex items-center gap-2 mb-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-sm font-bold font-mono tracking-wider uppercase text-emerald-300">
                AI Executive Summary
              </h3>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-normal">
              {analysisResult.document_summary}
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111C32] border border-emerald-500/30 text-xs font-mono font-semibold text-emerald-400">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>{analysisResult.requirements.length} requirement{analysisResult.requirements.length !== 1 ? 's' : ''} extracted</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111C32] border border-slate-700 text-xs font-mono font-semibold text-slate-300">
                <FileText className="w-3.5 h-3.5 text-cyan-400" />
                <span>{documentInfo.total_pages} page{documentInfo.total_pages !== 1 ? 's' : ''} verified</span>
              </div>
            </div>
          </div>

          {/* Requirements heading */}
          <div className="flex items-center justify-between pt-2">
            <h2 className="text-xl font-extrabold text-white tracking-tight">
              Actionable Compliance Requirements
            </h2>
            <span className="text-xs font-mono font-semibold text-neon-cyan bg-cyan-950/80 px-2.5 py-1 rounded-full border border-cyan-500/30">
              {analysisResult.requirements.length} Extracted
            </span>
          </div>

          {/* Empty state */}
          {analysisResult.requirements.length === 0 && (
            <div className="p-8 rounded-3xl bg-[#0F172A] border border-slate-800 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#111C32] flex items-center justify-center mx-auto mb-3 text-slate-400">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-200">
                No actionable compliance requirements were confidently identified.
              </h3>
              <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto">
                Review the source document manually or try uploading a policy with explicit statutory duties.
              </p>
            </div>
          )}

          {/* Requirement cards list */}
          <div className="space-y-4">
            {analysisResult.requirements.map((req, idx) => (
              <RequirementCard key={idx} req={req} index={idx} />
            ))}
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Extracted Text Preview Section                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="rounded-3xl bg-[#0F172A]/90 border border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-hidden mb-8 relative z-10">
        <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B1020]/60">
          <div>
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-neon-cyan" />
              <h2 className="text-base font-bold text-white">Extracted Text Preview</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Verified page-level content with normalized paragraph boundaries.
            </p>
          </div>

          {pages.length > 1 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-mono text-slate-400 mr-1">Jump to:</span>
              {pages.map((p) => (
                <button
                  key={p.page}
                  type="button"
                  onClick={() => {
                    setActivePageTab(p.page);
                    const el = document.getElementById(`page-block-${p.page}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }}
                  className={`px-2.5 py-1 text-xs font-mono rounded-lg font-semibold transition ${
                    activePageTab === p.page
                      ? 'bg-cyan-950 text-neon-cyan border border-cyan-500/40 shadow-[0_0_10px_rgba(0,245,212,0.2)]'
                      : 'bg-[#111C32] border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  P.{p.page}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="p-5 sm:p-6 max-h-[420px] overflow-y-auto space-y-6 divide-y divide-slate-800/80">
          {pages.map((pageItem) => (
            <div
              key={pageItem.page}
              id={`page-block-${pageItem.page}`}
              className="pt-6 first:pt-0 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#111C32] text-slate-300 border border-slate-700/80">
                  <span className="w-2 h-2 rounded-full bg-neon-cyan shadow-[0_0_6px_#00F5D4]" />
                  Page {pageItem.page} of {documentInfo.total_pages}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {pageItem.text
                    ? `${pageItem.text.split(/\s+/).filter(Boolean).length} words`
                    : 'Empty page'}
                </span>
              </div>
              <div className="bg-[#0B1020]/90 rounded-2xl p-4 sm:p-5 border border-slate-800">
                {pageItem.text ? (
                  <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-slate-300 leading-relaxed font-normal">
                    {pageItem.text}
                  </pre>
                ) : (
                  <p className="text-xs text-slate-500 italic font-mono">(No text detected on this page)</p>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-slate-800/80 bg-[#0B1020]/60 flex items-center justify-between text-xs font-mono text-slate-400">
          <span>PyMuPDF Engine • Safe UTF-8 extraction</span>
          <span className="text-neon-cyan">
            Total {documentInfo.total_pages} Page{documentInfo.total_pages !== 1 ? 's' : ''}
          </span>
        </div>
      </div>
    </PageContainer>
  );
}

