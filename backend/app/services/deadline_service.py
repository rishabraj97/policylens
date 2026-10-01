"""
PolicyLens — Deadline Parsing & Classification Service (Step 5)
Provides safe, deterministic classification of requirement deadlines without guessing.
"""
from __future__ import annotations

import re
from datetime import date, datetime
from typing import Optional

OVERDUE = "overdue"
DUE_SOON = "due_soon"
UPCOMING = "upcoming"
NO_DEADLINE = "no_deadline"

VALID_DEADLINE_CATEGORIES = {OVERDUE, DUE_SOON, UPCOMING, NO_DEADLINE}

# Common standard date formats
DATE_FORMATS = [
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%d/%m/%Y",
    "%m/%d/%Y",
    "%d-%m-%Y",
    "%m-%d-%Y",
    "%B %d, %Y",
    "%b %d, %Y",
    "%B %d %Y",
    "%b %d %Y",
    "%d %B %Y",
    "%d %b %Y",
    "%Y-%m-%dT%H:%M:%S",
    "%Y-%m-%d %H:%M:%S",
]

NON_DATE_STRINGS = {
    "not specified",
    "n/a",
    "none",
    "null",
    "undefined",
    "tbd",
    "unknown",
    "not applicable",
    "as needed",
    "ongoing",
    "annually",
    "quarterly",
    "monthly",
    "immediately",
}


def parse_deadline_date(deadline_str: Optional[str]) -> Optional[date]:
    """
    Parses a deadline string into a concrete Python date object.
    If the deadline string is absent, non-date text ('Not specified', 'Within 30 days'),
    or ambiguous, returns None without guessing.
    """
    if not deadline_str:
        return None

    cleaned = str(deadline_str).strip()
    if not cleaned or cleaned.lower() in NON_DATE_STRINGS:
        return None

    # Try ISO fromisoformat first (e.g., 2026-10-15 or 2026-10-15T00:00:00)
    try:
        iso_str = cleaned.replace("Z", "+00:00")
        dt = datetime.fromisoformat(iso_str)
        return dt.date()
    except (ValueError, TypeError):
        pass

    # Try explicit format list
    for fmt in DATE_FORMATS:
        try:
            return datetime.strptime(cleaned, fmt).date()
        except ValueError:
            continue

    # Regex search for explicit YYYY-MM-DD or DD/MM/YYYY inside surrounding text
    iso_match = re.search(r"\b(\d{4})[-/](\d{1,2})[-/](\d{1,2})\b", cleaned)
    if iso_match:
        try:
            year, month, day = map(int, iso_match.groups())
            return date(year, month, day)
        except ValueError:
            pass

    # Do NOT guess or extrapolate relative phrases like 'within 30 days'
    return None


def classify_deadline(
    deadline_str: Optional[str],
    status: Optional[str] = None,
    ref_date: Optional[date] = None,
) -> str:
    """
    Deterministically categorizes a requirement's deadline into:
    - 'overdue': deadline is before today AND status is not Completed
    - 'due_soon': deadline is today or within the next 7 days AND status is not Completed
    - 'upcoming': deadline is more than 7 days away (or completed with valid future date)
    - 'no_deadline': deadline is not specified, invalid date, or completed with past deadline

    Status + Deadline Interaction (Section 32):
    Completed requirements are not presented as active overdue work in the primary risk view.
    Completed + past deadline -> 'no_deadline' (not overdue active risk)
    Pending + past deadline -> 'overdue'
    Needs Review + past deadline -> 'overdue'
    """
    parsed = parse_deadline_date(deadline_str)
    if parsed is None:
        return NO_DEADLINE

    if ref_date is None:
        ref_date = date.today()

    is_completed = (status or "").strip().lower() == "completed"

    if parsed < ref_date:
        if is_completed:
            # Completed requirements must not be presented as active overdue work
            return NO_DEADLINE
        return OVERDUE

    delta_days = (parsed - ref_date).days
    if delta_days <= 7:
        if is_completed:
            return UPCOMING
        return DUE_SOON

    return UPCOMING
