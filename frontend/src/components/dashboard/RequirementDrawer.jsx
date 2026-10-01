import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  ShieldCheck,
  Building2,
  Calendar,
  FileCheck,
  Layers,
  Sparkles,
  BookOpen,
  Clock,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import Badge from '../common/Badge';
import { classifyDeadline, getDeadlineBadgeProps } from '../../utils/deadline';
import { formatDate } from '../../utils/formatters';

/**
 * Slide-over side panel / drawer for requirement details (Section 13, 14, 15)
 * Conforms to neon visual identity and responsive mobile full-screen layout.
 */
export default function RequirementDrawer({
  isOpen = false,
  requirement = null,
  parentDocument = null,
  onClose = () => {},
  onStatusChange = null,
  isUpdatingStatus = false,
}) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen || !requirement) return null;

  const deadlineCat = classifyDeadline(requirement.deadline, requirement.status);
  const deadlineProps = getDeadlineBadgeProps(deadlineCat);

  // Confidence calculation and formatting
  const rawConfidence = requirement.confidence !== undefined && requirement.confidence !== null
    ? requirement.confidence
    : 1.0;
  const confidencePercent = Math.round(rawConfidence <= 1.0 ? rawConfidence * 100 : rawConfidence);

  // Source pages formatting (Section 14: "Source: Page 7" or "Pages 7, 8")
  const pagesList = Array.isArray(requirement.source_pages)
    ? requirement.source_pages
    : requirement.source_pages ? [requirement.source_pages] : [];
  const sourcePagesDisplay = pagesList.length === 1
    ? `Page ${pagesList[0]}`
    : pagesList.length > 1
    ? `Pages ${pagesList.join(', ')}`
    : 'Not specified';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden" role="dialog" aria-modal="true">
      {/* Dimmed backdrop with glassmorphism */}
      <div
        className="fixed inset-0 bg-[#050816]/75 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-0 sm:pl-10">
        <div className="w-screen sm:max-w-lg md:max-w-xl bg-[#0B1020] border-l border-slate-800 shadow-2xl flex flex-col relative z-50 animate-slideInRight">
          {/* Neon Top Accent Line */}
          <div className="h-1 w-full bg-gradient-to-r from-neon-cyan via-teal-400 to-purple-500 shadow-[0_0_12px_rgba(0,245,212,0.6)]" />

          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-800/80 flex items-start justify-between gap-4 bg-[#0F172A]/70">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-mono font-bold text-neon-cyan bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                  ID #{requirement.id}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  Compliance Obligation Detail
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight leading-snug">
                Requirement Breakdown
              </h2>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition"
              aria-label="Close details panel"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Obligation Statement */}
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 block mb-1.5">
                Statutory Obligation / Clause
              </span>
              <p className="text-sm sm:text-base font-semibold text-white leading-relaxed">
                {requirement.requirement}
              </p>
            </div>

            {/* Operational Action */}
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-teal-400 block mb-1.5">
                Required Operational Action
              </span>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {requirement.action}
              </p>
            </div>

            {/* Key Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Department */}
              <div className="p-3.5 rounded-xl bg-[#0F172A]/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                  <Building2 className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Responsible Department</span>
                </div>
                <p className="text-xs font-semibold text-white">
                  {requirement.responsible_department || requirement.department || 'Not specified'}
                </p>
              </div>

              {/* Applicability */}
              <div className="p-3.5 rounded-xl bg-[#0F172A]/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                  <Layers className="w-3.5 h-3.5 text-teal-400" />
                  <span>Applicability Scope</span>
                </div>
                <p className="text-xs font-semibold text-white">
                  {requirement.applicability || 'All'}
                </p>
              </div>

              {/* Deadline */}
              <div className="p-3.5 rounded-xl bg-[#0F172A]/60 border border-slate-800">
                <div className="flex items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-slate-400">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>Statutory Deadline</span>
                  </div>
                  <span className={`text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded border ${deadlineProps.bg} ${deadlineProps.text} ${deadlineProps.border}`}>
                    {deadlineProps.label}
                  </span>
                </div>
                <p className="text-xs font-semibold text-white">
                  {requirement.deadline || 'Not specified'}
                </p>
              </div>

              {/* Source Pages (Section 14) */}
              <div className="p-3.5 rounded-xl bg-[#0F172A]/60 border border-slate-800">
                <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-slate-400 mb-1">
                  <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Source Information</span>
                </div>
                <p className="text-xs font-semibold text-neon-cyan font-mono">
                  {sourcePagesDisplay}
                </p>
                <span className="text-[10px] text-slate-500 font-mono">
                  Referenced in policy text
                </span>
              </div>
            </div>

            {/* Evidence Deliverable */}
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-400 block mb-1.5">
                Evidence Required for Audit
              </span>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-mono">
                {requirement.evidence_required || requirement.evidence || 'Not specified'}
              </p>
            </div>

            {/* AI Confidence (Section 15: Clearly labeled "AI confidence" - NOT Accuracy or Legal certainty) */}
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-neon-cyan" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                    AI confidence
                  </span>
                </div>
                <span className="text-sm font-bold font-mono text-neon-cyan">
                  {confidencePercent}%
                </span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                <div
                  className="bg-gradient-to-r from-neon-cyan to-teal-400 h-full rounded-full transition-all duration-700 shadow-[0_0_8px_rgba(0,245,212,0.5)]"
                  style={{ width: `${confidencePercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-2 font-mono">
                Confidence score from neural requirement extraction model
              </p>
            </div>

            {/* Document Association */}
            <div className="p-4 rounded-2xl bg-[#0F172A] border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Parent Policy Document
                </span>
                <p className="text-xs font-semibold text-white truncate max-w-[240px]">
                  {parentDocument?.filename || `Document #${requirement.document_id || 'N/A'}`}
                </p>
              </div>
              {requirement.document_id && (
                <Link
                  to={`/documents/${requirement.document_id}`}
                  className="inline-flex items-center gap-1 text-xs font-mono text-neon-cyan hover:underline shrink-0"
                >
                  <span>View Doc</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {/* Audit Timestamps */}
            <div className="p-3.5 rounded-xl bg-[#0B1020]/60 border border-slate-800 text-[11px] font-mono text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span>Created: {formatDate(requirement.created_at, true)}</span>
              <span>Updated: {formatDate(requirement.updated_at, true)}</span>
            </div>
          </div>

          {/* Drawer Footer with Interactive Status Update */}
          <div className="p-5 border-t border-slate-800 bg-[#0F172A] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-slate-400">Current Status:</span>
              {onStatusChange ? (
                <select
                  value={requirement.status}
                  disabled={isUpdatingStatus}
                  onChange={(e) => onStatusChange(requirement.id, e.target.value)}
                  className={`text-xs font-semibold rounded-full border px-3 py-1.5 bg-[#0B1020] cursor-pointer transition focus:outline-none focus:ring-1 focus:ring-neon-cyan ${
                    requirement.status === 'Completed'
                      ? 'border-emerald-500/40 text-emerald-300'
                      : requirement.status === 'Needs Review'
                      ? 'border-rose-500/40 text-rose-300'
                      : 'border-amber-500/40 text-amber-300'
                  }`}
                >
                  <option value="Pending" className="bg-[#0B1020] text-amber-300">● Pending</option>
                  <option value="Needs Review" className="bg-[#0B1020] text-rose-300">● Needs Review</option>
                  <option value="Completed" className="bg-[#0B1020] text-emerald-300">● Completed</option>
                </select>
              ) : (
                <Badge
                  variant={
                    requirement.status === 'Completed'
                      ? 'emerald'
                      : requirement.status === 'Needs Review'
                      ? 'rose'
                      : 'amber'
                  }
                >
                  {requirement.status}
                </Badge>
              )}
              {isUpdatingStatus && (
                <span className="text-[11px] font-mono text-cyan-400 animate-pulse">
                  Saving...
                </span>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
