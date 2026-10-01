/**
 * PolicyLens — Deadline Utilities (Step 5)
 * Safe deterministic classification and styling helpers.
 */

export const OVERDUE = 'overdue';
export const DUE_SOON = 'due_soon';
export const UPCOMING = 'upcoming';
export const NO_DEADLINE = 'no_deadline';

const NON_DATE_REGEX = /^(not specified|n\/a|none|null|undefined|tbd|unknown|as needed|ongoing|annually|quarterly|monthly|immediately)$/i;

/**
 * Parses deadline string into a valid Date object.
 * Returns null without guessing if absent, non-date text, or unparseable.
 */
export function parseDeadlineDate(deadlineStr) {
  if (!deadlineStr) return null;
  const cleaned = String(deadlineStr).trim();
  if (!cleaned || NON_DATE_REGEX.test(cleaned)) {
    return null;
  }

  // Check for bare 4-digit year (do not guess full date)
  if (/^\d{4}$/.test(cleaned)) {
    return null;
  }

  // Try parsing direct ISO or standard date formats
  const parsed = new Date(cleaned);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }

  // Regex attempt for YYYY-MM-DD or DD/MM/YYYY
  const isoMatch = cleaned.match(/\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (isoMatch) {
    const [_, y, m, d] = isoMatch;
    const testDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));
    if (!isNaN(testDate.getTime())) return testDate;
  }

  return null;
}

/**
 * Deterministically classifies deadline according to Step 5 rules:
 * - Overdue: deadline before today AND status != 'Completed'
 * - Due Soon: deadline today or within next 7 days AND status != 'Completed'
 * - Upcoming: deadline > 7 days away
 * - No Deadline: unparseable, 'Not specified', or completed with past deadline (Section 32)
 */
export function classifyDeadline(deadlineStr, status = '', refDate = new Date()) {
  const parsed = parseDeadlineDate(deadlineStr);
  if (!parsed) return NO_DEADLINE;

  const today = new Date(refDate.getFullYear(), refDate.getMonth(), refDate.getDate());
  const target = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  const isCompleted = String(status).trim().toLowerCase() === 'completed';

  if (diffDays < 0) {
    // Completed requirements must not be presented as active overdue work
    return isCompleted ? NO_DEADLINE : OVERDUE;
  }
  if (diffDays <= 7) {
    return isCompleted ? UPCOMING : DUE_SOON;
  }
  return UPCOMING;
}

/**
 * Returns visual styling tokens conforming to the neon design system:
 * - Overdue -> red
 * - Due Soon -> amber
 * - Upcoming -> cyan
 * - No Deadline -> muted slate
 */
export function getDeadlineBadgeProps(category) {
  switch (category) {
    case OVERDUE:
      return {
        label: 'Overdue',
        variant: 'red',
        bg: 'bg-rose-950/70',
        text: 'text-rose-400',
        border: 'border-rose-500/40',
        indicator: 'bg-rose-400 shadow-[0_0_8px_#ef4444]',
      };
    case DUE_SOON:
      return {
        label: 'Due Soon',
        variant: 'amber',
        bg: 'bg-amber-950/70',
        text: 'text-amber-400',
        border: 'border-amber-500/40',
        indicator: 'bg-amber-400 shadow-[0_0_8px_#f59e0b]',
      };
    case UPCOMING:
      return {
        label: 'Upcoming',
        variant: 'cyan',
        bg: 'bg-cyan-950/70',
        text: 'text-cyan-400',
        border: 'border-cyan-500/40',
        indicator: 'bg-cyan-400 shadow-[0_0_8px_#00F5D4]',
      };
    case NO_DEADLINE:
    default:
      return {
        label: 'No Deadline',
        variant: 'muted',
        bg: 'bg-slate-900/70',
        text: 'text-slate-400',
        border: 'border-slate-800',
        indicator: 'bg-slate-500',
      };
  }
}
