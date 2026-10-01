import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileText,
  Calendar,
  Layers,
  Building2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  ShieldCheck,
  Search,
  BookOpen,
  MessageSquare,
  Sparkles,
} from 'lucide-react';
import PageContainer from '../components/layout/PageContainer';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import RequirementDrawer from '../components/dashboard/RequirementDrawer';
import api from '../services/api';
import { formatDate, formatBytes } from '../utils/formatters';
import { classifyDeadline, getDeadlineBadgeProps } from '../utils/deadline';

/**
 * Document Detail Page (Section 18 & 19)
 * Route: /documents/:id
 * Displays document metadata, words, characters, pages, file size,
 * and scoped requirements belonging specifically to this document.
 */
export default function DocumentDetailPage() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [selectedRequirement, setSelectedRequirement] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchDocument = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDocument(id);
      setDoc(data);
    } catch (err) {
      console.warn('[DocumentDetail] Failed to load:', err.message);
      setError('Document not found or unable to load.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  const handleStatusChange = async (reqId, newStatus) => {
    try {
      setUpdatingStatusId(reqId);
      // Optimistic update
      setDoc((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          requirements: (prev.requirements || []).map((r) =>
            r.id === reqId ? { ...r, status: newStatus } : r
          ),
        };
      });

      if (selectedRequirement && selectedRequirement.id === reqId) {
        setSelectedRequirement((prev) => ({ ...prev, status: newStatus }));
      }

      await api.updateRequirementStatus(reqId, newStatus);
    } catch (err) {
      console.warn('[DocumentDetail] Status update failed:', err.message);
      fetchDocument();
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const filteredRequirements = (doc?.requirements || []).filter((req) => {
    const term = searchTerm.toLowerCase();
    const dept = req.responsible_department || req.department || '';
    return (
      (req.requirement || '').toLowerCase().includes(term) ||
      (req.action || '').toLowerCase().includes(term) ||
      dept.toLowerCase().includes(term)
    );
  });

  return (
    <PageContainer maxWidth="max-w-6xl">
      {/* Background ambient glow */}
      <div className="ambient-glow w-96 h-96 bg-cyan-500/10 top-1/4 left-1/2 -translate-x-1/2 pointer-events-none" />

      {/* Navigation header */}
      <div className="mb-6 flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <Link to="/documents">
            <Button variant="ghost" size="sm" icon={ArrowLeft}>
              All Documents
            </Button>
          </Link>
          <span className="text-slate-600">•</span>
          <Link to="/dashboard" className="text-xs font-mono text-slate-400 hover:text-white transition">
            Dashboard
          </Link>
        </div>
      </div>

      {/* Loading state (Section 24) */}
      {loading && (
        <div className="rounded-3xl bg-[#0F172A]/90 border border-slate-800/80 p-16 text-center backdrop-blur-md">
          <Loader2 className="w-8 h-8 text-neon-cyan animate-spin mx-auto mb-3" />
          <p className="text-xs sm:text-sm font-mono text-cyan-300">
            Loading document details...
          </p>
        </div>
      )}

      {/* Error state (Section 23) */}
      {!loading && error && (
        <div className="rounded-3xl bg-rose-950/30 border border-rose-500/40 p-8 text-center backdrop-blur-md">
          <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
          <h3 className="text-base font-bold text-white mb-1">{error}</h3>
          <p className="text-xs text-slate-400 mb-4">
            Unable to load compliance data.
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="primary" size="sm" onClick={fetchDocument}>
              Retry
            </Button>
            <Link to="/documents">
              <Button variant="secondary" size="sm">
                View All Documents
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Loaded Content */}
      {!loading && !error && doc && (
        <div className="space-y-6 relative z-10">
          {/* Header Card with all Section 18 fields */}
          <div className="rounded-3xl bg-[#0F172A]/90 border border-slate-800/80 p-6 shadow-sm backdrop-blur-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-cyan-950/80 text-neon-cyan border border-cyan-500/30 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Document Registry ID #{doc.id}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white break-words">
                  {doc.filename}
                </h1>
                <p className="mt-1 text-xs font-mono text-slate-400">
                  Uploaded on {formatDate(doc.created_at, true)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-mono px-3 py-1 rounded-full bg-cyan-950 text-neon-cyan border border-cyan-500/40 font-bold">
                  Status: {doc.analysis_status}
                </span>
                <Link to={`/documents/${doc.id}/chat`}>
                  <button
                    id="open-policylens-ai"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold font-mono bg-gradient-to-r from-cyan-950 to-purple-950 text-neon-cyan border border-cyan-500/40 hover:border-cyan-400 hover:shadow-neon-cyan transition-all duration-200"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    PolicyLens AI
                  </button>
                </Link>
              </div>
            </div>

            {/* Quick Metrics Grid (Section 18: File type, File size, Pages, Words, Characters, Number of requirements) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
              <div className="p-3 rounded-xl bg-[#0B1020]/60 border border-slate-800/60">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">File Type</span>
                <p className="text-sm font-bold text-white uppercase mt-0.5">{doc.file_type}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1020]/60 border border-slate-800/60">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">File Size</span>
                <p className="text-sm font-bold text-white mt-0.5">{formatBytes(doc.file_size)}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1020]/60 border border-slate-800/60">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Total Pages</span>
                <p className="text-sm font-bold text-white mt-0.5">{doc.total_pages}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1020]/60 border border-slate-800/60">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Words</span>
                <p className="text-sm font-bold text-white mt-0.5">{doc.word_count?.toLocaleString() || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1020]/60 border border-slate-800/60">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Characters</span>
                <p className="text-sm font-bold text-white mt-0.5">{doc.character_count?.toLocaleString() || 0}</p>
              </div>
              <div className="p-3 rounded-xl bg-[#0B1020]/60 border border-slate-800/60">
                <span className="text-[10px] font-mono text-slate-400 uppercase block">Requirements</span>
                <p className="text-sm font-bold text-neon-cyan mt-0.5">{doc.requirements?.length || 0}</p>
              </div>
            </div>

            {/* Document Summary */}
            {doc.document_summary && (
              <div className="mt-5 p-4 rounded-2xl bg-cyan-950/20 border border-cyan-500/20">
                <span className="text-xs font-mono font-semibold text-cyan-300 uppercase tracking-wider block mb-1">
                  AI Document Summary
                </span>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  {doc.document_summary}
                </p>
              </div>
            )}
          </div>

          {/* Scoped Requirements Matrix (Section 19: Only requirements belonging to this document) */}
          <div className="rounded-3xl bg-[#0F172A]/90 border border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-hidden">
            <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1020]/60">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Decomposed Compliance Obligations
                </h2>
                <span className="text-xs font-mono font-semibold text-neon-cyan bg-cyan-950/80 px-2.5 py-0.5 rounded-full border border-cyan-500/30">
                  {doc.requirements?.length || 0} obligations
                </span>
              </div>

              {/* Search */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter document clauses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-700/80 bg-[#0F172A] text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800/80 bg-[#0B1020]/80 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3 px-5 w-[28%]">Obligation</th>
                    <th className="py-3 px-5 w-[24%]">Operational Action</th>
                    <th className="py-3 px-5 w-[14%]">Department</th>
                    <th className="py-3 px-5 w-[14%]">Deadline</th>
                    <th className="py-3 px-5 w-[10%]">Evidence</th>
                    <th className="py-3 px-5 w-[10%] text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm text-slate-300">
                  {filteredRequirements.map((row) => {
                    const dlCat = classifyDeadline(row.deadline, row.status);
                    const dlBadge = getDeadlineBadgeProps(dlCat);

                    return (
                      <tr
                        key={row.id}
                        onClick={() => setSelectedRequirement(row)}
                        className="hover:bg-[#111C32]/80 transition group cursor-pointer"
                      >
                        <td className="py-4 px-5 font-medium text-white leading-snug">
                          <div className="flex items-start gap-2">
                            <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20 shrink-0 mt-0.5">
                              #{row.id}
                            </span>
                            <span className="group-hover:text-neon-cyan transition">{row.requirement}</span>
                          </div>
                          {row.source_pages && row.source_pages.length > 0 && (
                            <div className="mt-1 text-[10px] font-mono text-slate-500">
                              Pages: [{row.source_pages.join(', ')}]
                            </div>
                          )}
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-300 leading-relaxed">
                          {row.action}
                        </td>
                        <td className="py-4 px-5 text-xs font-mono text-slate-300 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-[#111C32] border border-slate-700/80 text-slate-300">
                            <Building2 className="w-3 h-3 text-cyan-400" />
                            {row.responsible_department || row.department || 'Not specified'}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-xs font-mono text-slate-300 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-amber-400" />
                              <span>{row.deadline || 'Not specified'}</span>
                            </div>
                            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border w-fit ${dlBadge.bg} ${dlBadge.text} ${dlBadge.border}`}>
                              {dlBadge.label}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-5 text-xs text-slate-400">
                          <span className="line-clamp-2 font-mono text-[11px]" title={row.evidence_required || row.evidence}>
                            {row.evidence_required || row.evidence || 'Not specified'}
                          </span>
                        </td>
                        <td className="py-4 px-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <select
                            value={row.status}
                            disabled={updatingStatusId === row.id}
                            onChange={(e) => handleStatusChange(row.id, e.target.value)}
                            className={`text-xs font-semibold rounded-full border px-2.5 py-1 bg-[#0F172A] cursor-pointer transition focus:outline-none focus:ring-1 focus:ring-neon-cyan ${
                              row.status === 'Completed'
                                ? 'border-emerald-500/40 text-emerald-300'
                                : row.status === 'Needs Review'
                                ? 'border-rose-500/40 text-rose-300'
                                : 'border-amber-500/40 text-amber-300'
                            }`}
                          >
                            <option value="Pending" className="bg-[#0F172A] text-amber-300">● Pending</option>
                            <option value="Needs Review" className="bg-[#0F172A] text-rose-300">● Needs Review</option>
                            <option value="Completed" className="bg-[#0F172A] text-emerald-300">● Completed</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredRequirements.length === 0 && (
                    <tr>
                      <td colSpan="6" className="py-10 text-center text-xs font-mono text-slate-400">
                        {searchTerm ? `No obligations match "${searchTerm}".` : 'No compliance requirements found for this document.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Requirement Details Drawer (Section 13) */}
      <RequirementDrawer
        isOpen={Boolean(selectedRequirement)}
        requirement={selectedRequirement}
        parentDocument={doc}
        onClose={() => setSelectedRequirement(null)}
        onStatusChange={handleStatusChange}
        isUpdatingStatus={updatingStatusId === selectedRequirement?.id}
      />
    </PageContainer>
  );
}
