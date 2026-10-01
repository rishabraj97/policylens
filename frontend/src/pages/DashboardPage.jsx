import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileCheck,
  Search,
  Filter,
  UploadCloud,
  ShieldCheck,
  Building2,
  Calendar,
  Sparkles,
  BookOpen,
  ArrowRight,
  Loader2,
  RefreshCw,
  ArrowUpDown,
  FileText,
  HelpCircle,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import Sidebar from '../components/layout/Sidebar';
import StatCard from '../components/ui/StatCard';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import ComplianceScore from '../components/dashboard/ComplianceScore';
import StatusDistribution from '../components/dashboard/StatusDistribution';
import DeadlineOverview from '../components/dashboard/DeadlineOverview';
import RecentDocuments from '../components/dashboard/RecentDocuments';
import RequirementDrawer from '../components/dashboard/RequirementDrawer';
import InsightsCarousel from '../components/dashboard/InsightsCarousel';
import api from '../services/api';
import { classifyDeadline, getDeadlineBadgeProps, parseDeadlineDate, OVERDUE, DUE_SOON, UPCOMING, NO_DEADLINE } from '../utils/deadline';

export default function DashboardPage() {
  const [requirements, setRequirements] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updatingStatusId, setUpdatingStatusId] = useState(null);
  const [updateError, setUpdateError] = useState(null);

  // Requirement Detail Drawer state
  const [selectedRequirement, setSelectedRequirement] = useState(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [departmentFilter, setDepartmentFilter] = useState('All');
  const [deadlineFilter, setDeadlineFilter] = useState(null); // null | 'overdue' | 'due_soon' | 'upcoming' | 'no_deadline'
  const [documentFilter, setDocumentFilter] = useState('All');

  // Sorting state (Section 11)
  const [sortBy, setSortBy] = useState('id'); // 'id' | 'deadline' | 'status' | 'confidence'
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

  // Centralized data loading using real database endpoints
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setUpdateError(null);

      const [reqsData, docsData, statsData] = await Promise.all([
        api.getRequirements(),
        api.getDocuments().catch(() => []),
        api.getDashboardStats().catch(() => null),
      ]);

      setRequirements(reqsData || []);
      setDocuments(docsData || []);
      setStats(statsData);
    } catch (err) {
      console.warn('[Dashboard] Data fetch failed:', err.message);
      setError('Unable to load compliance data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // Status update handler with optimistic update and rollback on failure (Section 12 & 26)
  const handleStatusChange = async (reqId, newStatus) => {
    // Save previous state for rollback
    const previousReq = requirements.find((r) => r.id === reqId);
    const oldStatus = previousReq?.status;

    try {
      setUpdatingStatusId(reqId);
      setUpdateError(null);

      // Optimistically update local requirements
      setRequirements((prev) =>
        prev.map((r) => (r.id === reqId ? { ...r, status: newStatus } : r))
      );

      // If drawer is open with this requirement, update it too
      if (selectedRequirement && selectedRequirement.id === reqId) {
        setSelectedRequirement((prev) => ({ ...prev, status: newStatus }));
      }

      // Execute backend PATCH request
      await api.updateRequirementStatus(reqId, newStatus);

      // Real-time feel: Refresh dashboard stats in background
      api.getDashboardStats().then((refreshedStats) => {
        if (refreshedStats) setStats(refreshedStats);
      }).catch(() => {});
    } catch (err) {
      console.warn('[Dashboard] Status update failed:', err.message);
      // Rollback to previous status on error
      if (oldStatus) {
        setRequirements((prev) =>
          prev.map((r) => (r.id === reqId ? { ...r, status: oldStatus } : r))
        );
        if (selectedRequirement && selectedRequirement.id === reqId) {
          setSelectedRequirement((prev) => ({ ...prev, status: oldStatus }));
        }
      }
      setUpdateError(`Failed to update status for obligation #${reqId}. Changes rolled back.`);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Top Statistics & Compliance Score calculated from DB (fallback to local if stats endpoint unavailable)
  const total = stats ? stats.total : requirements.length;
  const pending = stats ? stats.pending : requirements.filter((r) => r.status === 'Pending').length;
  const completed = stats ? stats.completed : requirements.filter((r) => r.status === 'Completed').length;
  const needsReview = stats ? stats.needs_review : requirements.filter((r) => r.status === 'Needs Review').length;
  const complianceScore = stats
    ? Math.round(stats.compliance_score)
    : total > 0 ? Math.round((completed / total) * 100) : 0;

  // Deadline breakdown numbers
  const overdueCount = stats ? stats.overdue : requirements.filter((r) => classifyDeadline(r.deadline, r.status) === OVERDUE).length;
  const dueSoonCount = stats ? stats.due_soon : requirements.filter((r) => classifyDeadline(r.deadline, r.status) === DUE_SOON).length;
  const upcomingCount = stats ? stats.upcoming : requirements.filter((r) => classifyDeadline(r.deadline, r.status) === UPCOMING).length;
  const noDeadlineCount = stats ? stats.no_deadline : requirements.filter((r) => classifyDeadline(r.deadline, r.status) === NO_DEADLINE).length;

  // Unique departments for filter dropdown
  const uniqueDepartments = useMemo(() => {
    const depts = new Set();
    requirements.forEach((r) => {
      const d = r.responsible_department || r.department;
      if (d && d.trim() && d.toLowerCase() !== 'not specified') depts.add(d.trim());
    });
    return Array.from(depts).sort();
  }, [requirements]);

  // Filtered & Sorted Requirements
  const filteredRequirements = useMemo(() => {
    return requirements
      .filter((item) => {
        // Search filter (case-insensitive across requirement, action, department, evidence)
        const term = searchTerm.toLowerCase();
        const dept = (item.responsible_department || item.department || '').toLowerCase();
        const action = (item.action || '').toLowerCase();
        const req = (item.requirement || '').toLowerCase();
        const evidence = (item.evidence_required || item.evidence || '').toLowerCase();

        const matchesSearch =
          !term ||
          req.includes(term) ||
          action.includes(term) ||
          dept.includes(term) ||
          evidence.includes(term);

        // Status filter
        const matchesStatus =
          statusFilter === 'All' ||
          (item.status || '').toLowerCase() === statusFilter.toLowerCase();

        // Department filter
        const matchesDepartment =
          departmentFilter === 'All' ||
          (item.responsible_department || item.department || '').toLowerCase() === departmentFilter.toLowerCase();

        // Document filter
        const matchesDocument =
          documentFilter === 'All' ||
          String(item.document_id) === String(documentFilter);

        // Deadline filter
        const dlCat = classifyDeadline(item.deadline, item.status);
        const matchesDeadline = !deadlineFilter || dlCat === deadlineFilter;

        return matchesSearch && matchesStatus && matchesDepartment && matchesDocument && matchesDeadline;
      })
      .sort((a, b) => {
        let modifier = sortOrder === 'asc' ? 1 : -1;

        if (sortBy === 'deadline') {
          const dateA = parseDeadlineDate(a.deadline);
          const dateB = parseDeadlineDate(b.deadline);
          if (!dateA && !dateB) return 0;
          if (!dateA) return 1;
          if (!dateB) return -1;
          return (dateA.getTime() - dateB.getTime()) * modifier;
        }

        if (sortBy === 'status') {
          return (a.status || '').localeCompare(b.status || '') * modifier;
        }

        if (sortBy === 'confidence') {
          const confA = a.confidence ?? 1;
          const confB = b.confidence ?? 1;
          return (confA - confB) * modifier;
        }

        // Default sort by requirement ID
        return ((a.id || 0) - (b.id || 0)) * modifier;
      });
  }, [requirements, searchTerm, statusFilter, departmentFilter, documentFilter, deadlineFilter, sortBy, sortOrder]);

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Scroll to requirements management table
  const scrollToRequirements = () => {
    const el = document.getElementById('requirements-matrix');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-[#050816] relative overflow-hidden">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 cyber-grid opacity-50 pointer-events-none" />

      {/* Cyber Sidebar */}
      <Sidebar className="hidden lg:flex relative z-10" />

      {/* Main Command Center Content */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full relative z-10 space-y-8">
        {/* Section 2A: Header & Quick Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-cyan-950/80 text-neon-cyan border border-cyan-500/30 mb-2">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Real Compliance Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              Compliance Command Center
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-400">
              Monitor, manage and act on your organization's compliance requirements.
            </p>
          </div>

          {/* Section 21 & 25: Quick Actions & Refresh */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Refresh Button with spinning animation (Section 25) */}
            <Button
              variant="secondary"
              size="md"
              icon={RefreshCw}
              onClick={() => loadDashboardData(true)}
              disabled={loading || refreshing}
              className={refreshing ? '[&>svg]:animate-spin text-neon-cyan border-cyan-500/40' : ''}
              title="Refetch requirements, documents, and statistics"
            >
              <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>

            <Button
              variant="secondary"
              size="md"
              onClick={scrollToRequirements}
              className="text-slate-300 hover:text-white"
            >
              View Requirements
            </Button>

            <Link to="/documents">
              <Button variant="secondary" size="md" icon={BookOpen}>
                View Documents
              </Button>
            </Link>

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

        {/* Dynamic AI Insights Carousel */}
        <InsightsCarousel />

        {/* Update Error Toast / Notice */}
        {updateError && (
          <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-500/50 text-rose-300 text-xs flex items-center justify-between gap-3 animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{updateError}</span>
            </div>
            <button
              onClick={() => setUpdateError(null)}
              className="text-slate-400 hover:text-white text-xs underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Loading State (Section 24: Real loading state) */}
        {loading && (
          <div className="rounded-3xl bg-[#0F172A]/90 border border-slate-800/80 p-16 text-center shadow-lg backdrop-blur-md">
            <Loader2 className="w-8 h-8 text-neon-cyan animate-spin mx-auto mb-3" />
            <p className="text-xs sm:text-sm font-mono text-cyan-300">
              Loading compliance data...
            </p>
          </div>
        )}

        {/* Error State (Section 23: Clean error state with retry) */}
        {!loading && error && (
          <div className="rounded-3xl bg-rose-950/30 border border-rose-500/40 p-10 text-center backdrop-blur-md">
            <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white mb-1">
              Unable to load compliance data.
            </h3>
            <p className="text-xs text-slate-400 mb-5 max-w-sm mx-auto">
              Please verify backend connectivity and retry fetching live compliance metrics.
            </p>
            <Button
              variant="primary"
              size="md"
              onClick={() => loadDashboardData()}
              className="font-bold shadow-[0_0_20px_rgba(0,245,212,0.3)]"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Loaded Dashboard Content */}
        {!loading && !error && (
          <>
            {/* Section 3: Top Statistics Cards (Cyan: Total, Amber: Pending, Green: Completed, Purple: Review) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                title="Total Requirements"
                value={total}
                subtitle="Calculated across active database policies"
                icon={FileCheck}
                variant="cyan"
                trend={`${total} Tracked`}
              />
              <StatCard
                title="Pending"
                value={pending}
                subtitle="Awaiting operational task fulfillment"
                icon={Clock}
                variant="amber"
              />
              <StatCard
                title="Completed"
                value={completed}
                subtitle="Satisfied with verified audit evidence"
                icon={CheckCircle2}
                variant="emerald"
                trend="Verified"
              />
              <StatCard
                title="Needs Review"
                value={needsReview}
                subtitle="Flagged for internal compliance audit"
                icon={AlertTriangle}
                variant="rose"
              />
            </div>

            {/* Section 4 & 5: Compliance Score & Status Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="lg:col-span-2">
                <ComplianceScore
                  percentage={complianceScore}
                  completed={completed}
                  pending={pending}
                  needsReview={needsReview}
                  total={total}
                />
              </div>
              <div className="lg:col-span-1">
                <StatusDistribution
                  total={total}
                  completed={completed}
                  pending={pending}
                  needsReview={needsReview}
                />
              </div>
            </div>

            {/* Section 6 & 7: Deadline / Risk Overview */}
            <DeadlineOverview
              overdue={overdueCount}
              dueSoon={dueSoonCount}
              upcoming={upcomingCount}
              noDeadline={noDeadlineCount}
              activeFilter={deadlineFilter}
              onSelectFilter={(catId) => setDeadlineFilter(catId)}
            />

            {/* Section 20: Recent Documents History */}
            <RecentDocuments documents={documents} />

            {/* Empty State when zero documents or zero requirements exist in DB (Section 22) */}
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
            ) : requirements.length === 0 ? (
              <div className="rounded-3xl bg-[#0F172A]/90 border border-slate-800/80 p-12 text-center shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md">
                <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center mx-auto mb-4 text-neon-cyan shadow-[0_0_20px_rgba(0,245,212,0.2)]">
                  <FileCheck className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  No compliance requirements found.
                </h3>
                <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">
                  Decompose uploaded documents to extract compliance obligations and track action items.
                </p>
                <Link to="/upload">
                  <Button variant="primary" size="md" icon={UploadCloud}>
                    Upload Policy
                  </Button>
                </Link>
              </div>
            ) : (
              /* Section 8: Requirements Management Working Area */
              <div
                id="requirements-matrix"
                className="rounded-3xl bg-[#0F172A]/90 border border-slate-800/80 shadow-[0_4px_24px_rgba(0,0,0,0.5)] backdrop-blur-md overflow-hidden"
              >
                {/* Table Header & Controls (Search, Filters, Sort) */}
                <div className="p-5 border-b border-slate-800/80 flex flex-col space-y-4 bg-[#0B1020]/60">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base sm:text-lg font-bold text-white">
                        Requirements Management
                      </h2>
                      <span className="text-xs font-mono font-semibold text-neon-cyan bg-cyan-950/80 px-2 py-0.5 rounded-full border border-cyan-500/30">
                        {filteredRequirements.length} shown
                      </span>
                    </div>

                    {/* Section 9: Search Input (case-insensitive across req, action, dept, evidence) */}
                    <div className="relative w-full sm:w-72">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search obligation, action, dept..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-700/80 bg-[#0F172A] text-white placeholder-slate-500 focus:outline-none focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan transition"
                      />
                    </div>
                  </div>

                  {/* Section 10: Multi-Criteria Filter Bar */}
                  <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800/60 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                      <Filter className="w-3.5 h-3.5" />
                      <span>Filters:</span>
                    </div>

                    {/* Status Filter */}
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="text-xs border border-slate-700/80 rounded-xl px-3 py-1.5 bg-[#0F172A] text-slate-200 focus:outline-none focus:border-neon-cyan"
                    >
                      <option value="All">All Statuses</option>
                      <option value="Pending">Pending</option>
                      <option value="Completed">Completed</option>
                      <option value="Needs Review">Needs Review</option>
                    </select>

                    {/* Department Filter */}
                    {uniqueDepartments.length > 0 && (
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="text-xs border border-slate-700/80 rounded-xl px-3 py-1.5 bg-[#0F172A] text-slate-200 focus:outline-none focus:border-neon-cyan max-w-[160px] truncate"
                      >
                        <option value="All">All Departments</option>
                        {uniqueDepartments.map((dept) => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    )}

                    {/* Document Filter */}
                    {documents.length > 1 && (
                      <select
                        value={documentFilter}
                        onChange={(e) => setDocumentFilter(e.target.value)}
                        className="text-xs border border-slate-700/80 rounded-xl px-3 py-1.5 bg-[#0F172A] text-slate-200 focus:outline-none focus:border-neon-cyan max-w-[180px] truncate"
                      >
                        <option value="All">All Documents</option>
                        {documents.map((d) => (
                          <option key={d.id} value={d.id}>{d.filename}</option>
                        ))}
                      </select>
                    )}

                    {/* Deadline Filter */}
                    <select
                      value={deadlineFilter || 'All'}
                      onChange={(e) => setDeadlineFilter(e.target.value === 'All' ? null : e.target.value)}
                      className="text-xs border border-slate-700/80 rounded-xl px-3 py-1.5 bg-[#0F172A] text-slate-200 focus:outline-none focus:border-neon-cyan"
                    >
                      <option value="All">All Deadlines</option>
                      <option value={OVERDUE}>Overdue</option>
                      <option value={DUE_SOON}>Due Soon</option>
                      <option value={UPCOMING}>Upcoming</option>
                      <option value={NO_DEADLINE}>No Deadline</option>
                    </select>

                    {/* Reset Filters Button */}
                    {(statusFilter !== 'All' || departmentFilter !== 'All' || documentFilter !== 'All' || deadlineFilter !== null || searchTerm) && (
                      <button
                        onClick={() => {
                          setStatusFilter('All');
                          setDepartmentFilter('All');
                          setDocumentFilter('All');
                          setDeadlineFilter(null);
                          setSearchTerm('');
                        }}
                        className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline ml-auto"
                      >
                        Reset All Filters
                      </button>
                    )}
                  </div>
                </div>

                {/* Section 8 & 27: Responsive Requirements Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800/80 bg-[#0B1020]/80 text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                        <th
                          onClick={() => toggleSort('id')}
                          className="py-3.5 px-5 w-[28%] cursor-pointer hover:text-white transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Obligation / Requirement</span>
                            <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </div>
                        </th>
                        <th className="py-3.5 px-5 w-[22%]">Operational Action</th>
                        <th className="py-3.5 px-5 w-[12%]">Department</th>
                        <th
                          onClick={() => toggleSort('deadline')}
                          className="py-3.5 px-5 w-[14%] cursor-pointer hover:text-white transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>Deadline</span>
                            <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </div>
                        </th>
                        <th
                          onClick={() => toggleSort('confidence')}
                          className="py-3.5 px-5 w-[10%] cursor-pointer hover:text-white transition"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>AI Confidence</span>
                            <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </div>
                        </th>
                        <th
                          onClick={() => toggleSort('status')}
                          className="py-3.5 px-5 w-[14%] text-right cursor-pointer hover:text-white transition"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <span>Status</span>
                            <ArrowUpDown className="w-3 h-3 opacity-60" />
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-xs sm:text-sm text-slate-300">
                      {filteredRequirements.map((row) => {
                        const dlCat = classifyDeadline(row.deadline, row.status);
                        const dlBadge = getDeadlineBadgeProps(dlCat);
                        const rawConf = row.confidence !== undefined && row.confidence !== null ? row.confidence : 1.0;
                        const confPct = Math.round(rawConf <= 1.0 ? rawConf * 100 : rawConf);

                        return (
                          <tr
                            key={row.id}
                            onClick={() => setSelectedRequirement(row)}
                            className="hover:bg-[#111C32]/80 transition-colors group cursor-pointer"
                          >
                            {/* Requirement / Obligation */}
                            <td className="py-4 px-5 font-medium text-white leading-snug">
                              <div className="flex items-start gap-2">
                                <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-500/20 shrink-0 mt-0.5">
                                  #{row.id}
                                </span>
                                <span className="group-hover:text-neon-cyan transition">{row.requirement}</span>
                              </div>
                              {row.source_pages && row.source_pages.length > 0 && (
                                <div className="mt-1 flex items-center gap-1 text-[10px] font-mono text-slate-500">
                                  <span>Pages:</span>
                                  <span className="text-cyan-400">[{row.source_pages.join(', ')}]</span>
                                </div>
                              )}
                            </td>

                            {/* Operational Action */}
                            <td className="py-4 px-5 text-xs text-slate-300 leading-relaxed">
                              <span className="line-clamp-2">{row.action}</span>
                            </td>

                            {/* Department */}
                            <td className="py-4 px-5 text-xs font-mono font-medium text-slate-300 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#111C32] border border-slate-700/80 text-slate-300">
                                <Building2 className="w-3 h-3 text-cyan-400" />
                                {row.responsible_department || row.department || 'Not specified'}
                              </span>
                            </td>

                            {/* Deadline + Category Badge (Section 6, 7, 31, 32) */}
                            <td className="py-4 px-5 text-xs font-mono text-slate-300 whitespace-nowrap">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-amber-400" />
                                  <span>{row.deadline || 'Not specified'}</span>
                                </div>
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded border w-fit ${dlBadge.bg} ${dlBadge.text} ${dlBadge.border}`}>
                                  {dlBadge.label}
                                </span>
                              </div>
                            </td>

                            {/* AI Confidence (Section 15: Clearly labeled "AI confidence" with subtle indicator) */}
                            <td className="py-4 px-5 text-xs font-mono whitespace-nowrap">
                              <div className="flex flex-col gap-1 w-20">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="text-slate-400">AI</span>
                                  <span className="text-neon-cyan font-bold">{confPct}%</span>
                                </div>
                                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                  <div
                                    className="bg-cyan-400 h-full rounded-full"
                                    style={{ width: `${confPct}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Interactive Status Changer (Section 12: Real API update with optimistic update) */}
                            <td className="py-4 px-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                              <div className="inline-flex flex-col items-end">
                                <select
                                  value={row.status}
                                  disabled={updatingStatusId === row.id}
                                  onChange={(e) => handleStatusChange(row.id, e.target.value)}
                                  className={`text-xs font-semibold rounded-full border px-2.5 py-1 bg-[#0F172A] cursor-pointer transition focus:outline-none focus:ring-1 focus:ring-neon-cyan ${
                                    row.status === 'Completed'
                                      ? 'border-emerald-500/40 text-emerald-300 hover:border-emerald-400'
                                      : row.status === 'Needs Review'
                                      ? 'border-rose-500/40 text-rose-300 hover:border-rose-400'
                                      : 'border-amber-500/40 text-amber-300 hover:border-amber-400'
                                  }`}
                                >
                                  <option value="Pending" className="bg-[#0F172A] text-amber-300">
                                    ● Pending
                                  </option>
                                  <option value="Needs Review" className="bg-[#0F172A] text-rose-300">
                                    ● Needs Review
                                  </option>
                                  <option value="Completed" className="bg-[#0F172A] text-emerald-300">
                                    ● Completed
                                  </option>
                                </select>
                                {updatingStatusId === row.id && (
                                  <span className="text-[10px] text-cyan-400 font-mono mt-0.5 animate-pulse">
                                    Syncing...
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}

                      {filteredRequirements.length === 0 && (
                        <tr>
                          <td colSpan="6" className="py-12 text-center text-xs font-mono text-slate-400">
                            No compliance obligations match your current search and filter selections.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Table Footer */}
                <div className="px-5 py-3.5 border-t border-slate-800/80 bg-[#0B1020]/60 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-400 gap-2">
                  <span>
                    Showing {filteredRequirements.length} of {requirements.length} compliance obligations
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Database Engine:</span>
                    <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-neon-cyan border border-cyan-500/30 text-[10px] font-bold">
                      SQLite Live Sync Active
                    </span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Section 13: Slide-over Drawer for Requirement Details */}
      <RequirementDrawer
        isOpen={Boolean(selectedRequirement)}
        requirement={selectedRequirement}
        parentDocument={
          selectedRequirement
            ? documents.find((d) => d.id === selectedRequirement.document_id)
            : null
        }
        onClose={() => setSelectedRequirement(null)}
        onStatusChange={handleStatusChange}
        isUpdatingStatus={updatingStatusId === selectedRequirement?.id}
      />
    </div>
  );
}
