import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Search,
  UploadCloud,
  FileText,
  Clock,
  Calendar,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';
import api from '../services/api';
import { formatDate, formatRelativeTime, formatBytes } from '../utils/formatters';

/**
 * Documents Management Page (Section 16, 17, 22, 23, 24)
 * Route: /documents
 * Displays all analyzed documents, search by filename, and links to /documents/:id.
 */
export default function DocumentsPage() {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadDocuments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getDocuments();
      setDocuments(data || []);
    } catch (err) {
      console.warn('[DocumentsPage] Fetch failed:', err.message);
      setError('Unable to load documents.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Case-insensitive filename search (Section 17)
  const filteredDocuments = documents.filter((doc) => {
    const term = searchTerm.toLowerCase();
    return (doc.filename || '').toLowerCase().includes(term);
  });

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#050816] relative overflow-hidden">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 cyber-grid opacity-50 pointer-events-none" />

      {/* Collapsible Cyber Sidebar */}
      <Sidebar className="hidden lg:flex relative z-10" />

      {/* Main Content Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full relative z-10 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-950/80 text-neon-cyan border border-cyan-500/30 mb-2">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Policy Repository Matrix</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Compliance Documents
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Manage ingested statutory policies, extracted audit clauses, and underlying file metadata.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              size="md"
              icon={RefreshCw}
              onClick={loadDocuments}
              disabled={loading}
              title="Refresh document repository"
            >
              Refresh
            </Button>
            <Link to="/upload">
              <Button
                variant="primary"
                size="md"
                icon={UploadCloud}
                className="font-bold shadow-[0_0_20px_rgba(0,245,212,0.35)]"
              >
                Upload Policy
              </Button>
            </Link>
          </div>
        </div>

        {/* Loading State (Section 24) */}
        {loading && (
          <div className="rounded-3xl bg-[#0F172A]/90 border border-slate-800/80 p-16 text-center shadow-lg backdrop-blur-md">
            <Loader2 className="w-8 h-8 text-neon-cyan animate-spin mx-auto mb-3" />
            <p className="text-xs sm:text-sm font-mono text-cyan-300">
              Loading documents...
            </p>
          </div>
        )}

        {/* Error State (Section 23) */}
        {!loading && error && (
          <div className="rounded-3xl bg-rose-950/30 border border-rose-500/40 p-8 text-center backdrop-blur-md">
            <AlertTriangle className="w-8 h-8 text-rose-400 mx-auto mb-2" />
            <h3 className="text-base font-bold text-white mb-1">
              Unable to load compliance data.
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Please check your connection and retry.
            </p>
            <Button variant="primary" size="sm" onClick={loadDocuments} className="font-bold">
              Retry
            </Button>
          </div>
        )}

        {/* Loaded Content */}
        {!loading && !error && (
          <>
            {/* Empty State when zero documents in DB (Section 22) */}
            {documents.length === 0 ? (
              <div className="rounded-3xl bg-[#0F172A]/90 border border-slate-800/80 p-12 text-center shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
                <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4 text-neon-cyan shadow-[0_0_20px_rgba(0,245,212,0.2)]">
                  <BookOpen className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  No policies analyzed yet.
                </h3>
                <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                  Upload your first policy to start building your compliance workspace.
                </p>
                <Link to="/upload">
                  <Button
                    variant="primary"
                    size="md"
                    icon={UploadCloud}
                    className="font-bold shadow-[0_0_20px_rgba(0,245,212,0.35)]"
                  >
                    Upload Policy
                  </Button>
                </Link>
              </div>
            ) : (
              /* Documents Table Card */
              <div className="rounded-3xl bg-[#0F172A]/90 border border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-hidden">
                {/* Search Header */}
                <div className="p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0B1020]/60">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-white">
                      All Registered Documents
                    </h2>
                    <span className="text-xs font-mono font-semibold text-neon-cyan bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                      {filteredDocuments.length} total
                    </span>
                  </div>

                  {/* Search Bar (Section 17: Search by filename) */}
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search by filename..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-700/80 bg-[#0F172A] text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition"
                    />
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-[#0B1020]/80 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        <th className="py-3.5 px-5 w-[35%]">Document Name</th>
                        <th className="py-3.5 px-5 w-[10%]">Type</th>
                        <th className="py-3.5 px-5 w-[12%]">Pages</th>
                        <th className="py-3.5 px-5 w-[15%]">Requirements</th>
                        <th className="py-3.5 px-5 w-[13%]">Analysis Status</th>
                        <th className="py-3.5 px-5 w-[15%] text-right">Uploaded Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm text-slate-300">
                      {filteredDocuments.map((doc) => (
                        <tr
                          key={doc.id}
                          className="hover:bg-[#111C32]/80 transition-colors group cursor-pointer"
                        >
                          <td className="py-4 px-5 font-medium text-white">
                            <Link
                              to={`/documents/${doc.id}`}
                              className="flex items-start gap-2.5 group-hover:text-neon-cyan transition"
                            >
                              <div className="p-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 text-neon-cyan shrink-0 mt-0.5">
                                <FileText className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-semibold block">{doc.filename}</span>
                                <span className="text-[11px] font-mono text-slate-500">
                                  {formatBytes(doc.file_size)} • {doc.word_count?.toLocaleString() || 0} words
                                </span>
                              </div>
                            </Link>
                          </td>

                          <td className="py-4 px-5">
                            <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-cyan-950/80 text-neon-cyan border border-cyan-500/30">
                              {doc.file_type}
                            </span>
                          </td>

                          <td className="py-4 px-5 font-mono text-slate-300">
                            {doc.total_pages} {doc.total_pages === 1 ? 'page' : 'pages'}
                          </td>

                          <td className="py-4 px-5 font-mono">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111C32] border border-cyan-500/20 text-cyan-300 font-semibold text-xs">
                              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                              {doc.requirements_count !== undefined ? `${doc.requirements_count} obligations` : 'Analyzed'}
                            </span>
                          </td>

                          <td className="py-4 px-5">
                            <Badge
                              variant={
                                doc.analysis_status === 'analyzed'
                                  ? 'emerald'
                                  : doc.analysis_status === 'processing'
                                  ? 'cyan'
                                  : 'amber'
                              }
                            >
                              {doc.analysis_status}
                            </Badge>
                          </td>

                          <td className="py-4 px-5 text-right font-mono text-xs text-slate-400 whitespace-nowrap">
                            <div className="flex items-center justify-end gap-2">
                              <div>
                                <span className="block text-white">
                                  {formatDate(doc.created_at)}
                                </span>
                                <span className="text-[10px] text-slate-500">
                                  {formatRelativeTime(doc.created_at)}
                                </span>
                              </div>
                              <Link
                                to={`/documents/${doc.id}`}
                                className="p-1 rounded-lg hover:bg-cyan-950/80 text-slate-400 hover:text-neon-cyan transition"
                                title="View document detail"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filteredDocuments.length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-12 text-center text-xs font-mono text-slate-400">
                            No documents match "{searchTerm}".
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="px-5 py-3.5 border-t border-slate-800/80 bg-[#0B1020]/60 flex items-center justify-between text-xs font-mono text-slate-400">
                  <span>
                    Showing {filteredDocuments.length} of {documents.length} recorded documents
                  </span>
                  <Link
                    to="/upload"
                    className="text-neon-cyan hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <span>Ingest New Policy</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
