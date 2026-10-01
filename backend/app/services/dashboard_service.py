"""
PolicyLens — Dashboard Analytics Service (Step 5)
Computes real-time compliance statistics, scores, and deadline distributions from database records.
"""
from __future__ import annotations

import logging
from typing import Optional
from sqlalchemy.orm import Session

from app.models.compliance import Requirement
from app.schemas.dashboard import DashboardStatsResponse
from app.services.deadline_service import (
    classify_deadline,
    OVERDUE,
    DUE_SOON,
    UPCOMING,
    NO_DEADLINE,
)

logger = logging.getLogger("policylens.services.dashboard_service")


def get_dashboard_stats(
    db: Session,
    document_id: Optional[int] = None,
) -> DashboardStatsResponse:
    """
    Computes dashboard metrics from active database requirements.
    - Status counts: Total, Pending, Completed, Needs Review
    - Compliance score: completed / total * 100 (safely handles zero requirements)
    - Deadline breakdown: Overdue, Due Soon, Upcoming, No Deadline
    """
    query = db.query(Requirement)
    if document_id is not None:
        query = query.filter(Requirement.document_id == document_id)

    requirements = query.all()
    total = len(requirements)

    pending = 0
    completed = 0
    needs_review = 0

    overdue = 0
    due_soon = 0
    upcoming = 0
    no_deadline = 0

    for r in requirements:
        status_clean = (r.status or "").strip().lower()
        if status_clean == "completed":
            completed += 1
        elif status_clean == "pending":
            pending += 1
        elif status_clean == "needs review":
            needs_review += 1
        else:
            # Fallback for unexpected status
            needs_review += 1

        # Safe deadline classification
        deadline_cat = classify_deadline(r.deadline, r.status)
        if deadline_cat == OVERDUE:
            overdue += 1
        elif deadline_cat == DUE_SOON:
            due_soon += 1
        elif deadline_cat == UPCOMING:
            upcoming += 1
        else:
            no_deadline += 1

    compliance_score = round((completed / total) * 100, 2) if total > 0 else 0.0

    return DashboardStatsResponse(
        total=total,
        pending=pending,
        completed=completed,
        needs_review=needs_review,
        compliance_score=compliance_score,
        overdue=overdue,
        due_soon=due_soon,
        upcoming=upcoming,
        no_deadline=no_deadline,
    )
