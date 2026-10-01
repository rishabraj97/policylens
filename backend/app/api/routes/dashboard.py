"""
PolicyLens — Dashboard API Routes (Step 5)
Provides aggregated compliance statistics, score, and deadline distributions.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.dashboard import DashboardStatsResponse
from app.services.dashboard_service import get_dashboard_stats

logger = logging.getLogger("policylens.routes.dashboard")

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get(
    "/stats",
    response_model=DashboardStatsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get compliance command center statistics",
    description=(
        "Returns calculated compliance metrics from database data: "
        "Total, Pending, Completed, Needs Review counts, Compliance Score (0-100), "
        "and Deadline breakdown (Overdue, Due Soon, Upcoming, No Deadline)."
    ),
)
def get_dashboard_stats_endpoint(
    document_id: Optional[int] = Query(None, description="Optional document ID to scope statistics"),
    db: Session = Depends(get_db),
) -> DashboardStatsResponse:
    """
    Computes and returns real-time compliance statistics from the database.
    """
    return get_dashboard_stats(db, document_id=document_id)
