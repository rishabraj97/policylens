"""
PolicyLens — Requirement Decomposition Schemas (Step 3)
Pydantic models for the AI-extracted compliance requirement structures.
"""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field, field_validator


# ---------------------------------------------------------------------------
# Allowed status values
# ---------------------------------------------------------------------------
VALID_STATUSES = {"Pending", "Needs Review", "Completed"}


class RequirementItem(BaseModel):
    """
    A single actionable compliance requirement extracted by the AI
    and optionally persisted to the database.
    """

    id: Optional[int] = Field(None, description="Database requirement ID if persisted.")
    document_id: Optional[int] = Field(None, description="Parent document ID in database.")
    requirement: str = Field(..., description="Clear statement of the compliance obligation.")
    action: str = Field(..., description="Practical action the organisation must perform.")
    applicability: str = Field(..., description="Who or what the requirement applies to.")
    deadline: Optional[str] = Field(
        "Not specified",
        description="Explicit deadline if stated; 'Not specified' otherwise.",
    )
    responsible_department: Optional[str] = Field(
        "Not specified",
        description="Department responsible; 'Not specified' when absent from the document.",
    )
    evidence_required: Optional[str] = Field(
        "Not specified",
        description="Evidence needed to demonstrate compliance.",
    )
    status: str = Field(
        "Needs Review",
        description="One of: 'Pending', 'Needs Review', 'Completed'.",
    )
    source_pages: List[int] = Field(
        ...,
        description="1-indexed page numbers where this requirement appears.",
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="AI confidence score between 0.0 and 1.0.",
    )
    created_at: Optional[datetime] = Field(None, description="Creation timestamp.")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp.")

    model_config = ConfigDict(from_attributes=True)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        if v not in VALID_STATUSES:
            # Check case-insensitively
            for valid in VALID_STATUSES:
                if str(v).strip().lower() == valid.lower():
                    return valid
            # Coerce unexpected values to 'Needs Review' for safety
            return "Needs Review"
        return v

    @field_validator("source_pages")
    @classmethod
    def validate_source_pages(cls, v: List[int]) -> List[int]:
        if not v:
            raise ValueError("source_pages must contain at least one page number.")
        for page in v:
            if page < 1:
                raise ValueError(f"Page numbers must be >= 1. Got: {page}")
        return sorted(set(v))  # deduplicate and sort

    @field_validator("deadline", mode="before")
    @classmethod
    def normalise_deadline(cls, v):
        if v is None or str(v).strip() == "":
            return "Not specified"
        return str(v).strip()

    @field_validator("responsible_department", mode="before")
    @classmethod
    def normalise_department(cls, v):
        if v is None or str(v).strip() == "":
            return "Not specified"
        return str(v).strip()

    @field_validator("evidence_required", mode="before")
    @classmethod
    def normalise_evidence(cls, v):
        if v is None or str(v).strip() == "":
            return "Not specified"
        return str(v).strip()


class RequirementStatusUpdate(BaseModel):
    """
    Request payload for updating a requirement's compliance status.
    PATCH /api/v1/requirements/{requirement_id}/status
    """

    status: str = Field(..., description="Target status: 'Pending', 'Completed', or 'Needs Review'")

    @field_validator("status")
    @classmethod
    def validate_target_status(cls, v: str) -> str:
        cleaned = str(v).strip()
        for valid in VALID_STATUSES:
            if cleaned.lower() == valid.lower():
                return valid
        raise ValueError(
            f"Invalid status '{v}'. Allowed values are: {', '.join(sorted(VALID_STATUSES))}"
        )


class DocumentAnalysisResponse(BaseModel):
    """
    Full AI analysis response for an uploaded policy document.
    """

    success: bool = True
    document_id: Optional[int] = Field(None, description="Persisted database document ID.")
    filename: Optional[str] = Field(None, description="Filename of analyzed policy document.")
    document_summary: str = Field(
        ..., description="High-level summary of the analysed document."
    )
    requirements: List[RequirementItem] = Field(
        ..., description="Extracted actionable compliance requirements."
    )

    model_config = ConfigDict(from_attributes=True)


class AnalyzeRequest(BaseModel):
    """
    Request body for POST /api/v1/documents/analyze.
    Reuses the DocumentPage structure from the upload pipeline.
    """

    pages: List[dict] = Field(
        ...,
        min_length=1,
        description="List of {page: int, text: str} objects produced by the upload endpoint.",
    )
    filename: Optional[str] = Field(None, description="Original filename (for logging).")
    document_id: Optional[int] = Field(None, description="Optional database document ID.")
    content_hash: Optional[str] = Field(None, description="Optional file content SHA-256 hash.")

