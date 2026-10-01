"""
PolicyLens — Requirement Database Service
Implements simple CRUD operations for compliance requirements.
"""
from __future__ import annotations

import logging
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session

from app.models.compliance import Requirement
from app.schemas.requirements import RequirementItem, VALID_STATUSES

logger = logging.getLogger("policylens.services.requirement_service")


def create_requirements(
    db: Session,
    document_id: int,
    requirements: List[RequirementItem],
) -> List[Requirement]:
    """
    Creates and persists a batch of Requirement records associated with a Document.
    Replaces any previously saved requirements for this document to avoid duplication.
    """
    # Clear existing requirements for this document if re-analyzing
    db.query(Requirement).filter(Requirement.document_id == document_id).delete()

    created_records: List[Requirement] = []
    for item in requirements:
        # Validate status or fallback
        status = item.status if item.status in VALID_STATUSES else "Needs Review"

        db_req = Requirement(
            document_id=document_id,
            requirement=item.requirement,
            action=item.action,
            applicability=item.applicability or "All",
            deadline=item.deadline or "Not specified",
            responsible_department=item.responsible_department or "Not specified",
            evidence_required=item.evidence_required or "Not specified",
            status=status,
            source_pages=item.source_pages if isinstance(item.source_pages, list) else [1],
            confidence=float(item.confidence) if item.confidence is not None else 1.0,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(db_req)
        created_records.append(db_req)

    db.commit()
    for req in created_records:
        db.refresh(req)

    logger.info(
        "Persisted %d requirements for document_id=%d",
        len(created_records),
        document_id,
    )
    return created_records


def get_requirement_by_id(db: Session, requirement_id: int) -> Optional[Requirement]:
    """
    Retrieves a single requirement by its primary key ID.
    """
    return db.query(Requirement).filter(Requirement.id == requirement_id).first()


def get_requirements(
    db: Session,
    document_id: Optional[int] = None,
    status: Optional[str] = None,
) -> List[Requirement]:
    """
    Retrieves requirements with optional filtering by document_id and/or status.
    """
    query = db.query(Requirement)

    if document_id is not None:
        query = query.filter(Requirement.document_id == document_id)

    if status and status.lower() != "all":
        query = query.filter(Requirement.status.ilike(status.strip()))

    return query.order_by(Requirement.id.asc()).all()


def get_all_requirements(db: Session) -> List[Requirement]:
    """
    Retrieves all compliance requirements in the database.
    """
    return db.query(Requirement).order_by(Requirement.id.asc()).all()


def update_requirement_status(
    db: Session,
    requirement_id: int,
    new_status: str,
) -> Optional[Requirement]:
    """
    Updates the status of an existing requirement.
    Validates that the status is one of Pending, Needs Review, or Completed.
    Returns the updated requirement, or None if not found.
    """
    # Normalize and validate status
    matched_status = None
    for valid in VALID_STATUSES:
        if new_status.strip().lower() == valid.lower():
            matched_status = valid
            break

    if not matched_status:
        raise ValueError(
            f"Invalid status '{new_status}'. Allowed values: {', '.join(sorted(VALID_STATUSES))}"
        )

    req = get_requirement_by_id(db, requirement_id)
    if not req:
        return None

    req.status = matched_status
    req.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(req)

    logger.info("Updated requirement_id=%d status to %s", requirement_id, matched_status)
    return req
