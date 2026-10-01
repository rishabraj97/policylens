import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ArrowRight, FileText, CheckCircle2, Clock } from 'lucide-react';
import { formatRelativeTime } from '../../utils/formatters';

/**
 * Recent Documents section for the Compliance Command Center (Section 20)
 * Displays latest 3–5 analyzed documents with clean relative timestamps and metrics.
 */
export default function RecentDocuments({ documents = [] }) {
  if (!documents || documents.length === 0) return null;

  const recentDocs = documents.slice(0, 5);

  return (
    <div className="rounded-3xl bg-[#0F172A]/90 border border-slate-800/80 p-5 sm:p-6 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/30 text-neon-cyan">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Recent Documents
            </h3>
            <p className="text-[11px] font-mono text-slate-400">
              Latest statutory instruments ingested into the compliance workspace
            </p>
          </div>
        </div>

        <Link
          to="/documents"
          className="inline-flex items-center gap-1 text-xs font-mono text-neon-cyan hover:underline group"
        >
          <span>View All Documents</span>
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {recentDocs.map((doc) => (
          <Link
            key={doc.id}
            to={`/documents/${doc.id}`}
            className="p-4 rounded-2xl bg-[#0B1020]/90 border border-slate-800/90 hover:border-cyan-500/50 hover:bg-[#111C32] transition group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-white group-hover:text-neon-cyan transition line-clamp-1">
                  {doc.filename}
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-neon-cyan border border-cyan-500/30 shrink-0">
                  {doc.file_type}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400 mb-2">
                <span>{doc.total_pages} {doc.total_pages === 1 ? 'page' : 'pages'}</span>
                <span>•</span>
                <span className="text-emerald-400">
                  {doc.requirements_count !== undefined ? `${doc.requirements_count} requirements` : 'Analyzed'}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-500" />
                <span>Analyzed {formatRelativeTime(doc.created_at)}</span>
              </span>
              <span className="text-cyan-400 group-hover:translate-x-1 transition-transform">
                →
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
