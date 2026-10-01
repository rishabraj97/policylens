"""
PolicyLens — Requirements API Routes
Handles compliance requirements retrieval and status updating (Step 4).
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.requirements import (
    RequirementItem,
    RequirementStatusUpdate,
)
from app.services.requirement_service import (
    get_requirements,
    get_requirement_by_id,
    update_requirement_status,
)

logger = logging.getLogger("policylens.routes.requirements")

router = APIRouter(prefix="/requirements", tags=["Requirements"])


@router.get(
    "",
    response_model=List[RequirementItem],
    status_code=status.HTTP_200_OK,
    summary="List all compliance requirements",
    description="Returns compliance requirements from the database with optional filtering by document and status.",
)
def list_requirements_endpoint(
    document_id: Optional[int] = Query(None, description="Filter requirements by parent document ID"),
    status: Optional[str] = Query(None, description="Filter requirements by status: 'Pending', 'Completed', 'Needs Review'"),
    db: Session = Depends(get_db),
) -> List[RequirementItem]:
    """
    Retrieves compliance requirements matching optional filter criteria.
    """
    db_reqs = get_requirements(db, document_id=document_id, status=status)
    return [RequirementItem.model_validate(r) for r in db_reqs]


@router.patch(
    "/{requirement_id}/status",
    response_model=RequirementItem,
    status_code=status.HTTP_200_OK,
    summary="Update requirement compliance status",
    description="Updates the status of a specific compliance requirement ('Pending', 'Completed', or 'Needs Review').",
)
def update_status_endpoint(
    requirement_id: int,
    body: RequirementStatusUpdate,
    db: Session = Depends(get_db),
) -> RequirementItem:
    """
    Updates the status of a compliance requirement in the database.
    """
    req = get_requirement_by_id(db, requirement_id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requirement with ID {requirement_id} not found.",
        )

    try:
        updated = update_requirement_status(db, requirement_id, body.status)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )

    if not updated:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requirement with ID {requirement_id} not found.",
        )

    return RequirementItem.model_validate(updated)


@router.get(
    "/{requirement_id}",
    response_model=RequirementItem,
    status_code=status.HTTP_200_OK,
    summary="Get single requirement details",
    description="Retrieves a single compliance requirement by primary key ID.",
)
def get_requirement_by_id_endpoint(
    requirement_id: int,
    db: Session = Depends(get_db),
) -> RequirementItem:
    """
    Retrieves a single requirement by ID.
    """
    req = get_requirement_by_id(db, requirement_id)
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Requirement with ID {requirement_id} not found.",
        )
    return RequirementItem.model_validate(req)
