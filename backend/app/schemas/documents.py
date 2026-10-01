from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.requirements import RequirementItem


class DocumentPage(BaseModel):
    """Represents a single page/section of an extracted document."""
    page: int = Field(..., description="1-indexed page number")
    text: str = Field(..., description="Normalized text content of this page")

    model_config = ConfigDict(from_attributes=True)


class DocumentMetadata(BaseModel):
    """Metadata summary of the processed policy document."""
    id: Optional[int] = Field(None, description="Database document ID if persisted")
    filename: str = Field(..., description="Original filename of the uploaded document")
    file_type: str = Field(..., description="Normalized file format extension ('pdf' or 'txt')")
    file_size: int = Field(..., description="File size in bytes")
    total_pages: int = Field(..., description="Total number of pages/sections extracted")
    character_count: int = Field(..., description="Total characters across all extracted pages")
    word_count: int = Field(..., description="Total words across all extracted pages")
    analysis_status: Optional[str] = Field("uploaded", description="Analysis status: uploaded, processing, analyzed, failed")
    content_hash: Optional[str] = Field(None, description="SHA-256 hash of file content")
    created_at: Optional[datetime] = Field(None, description="Ingestion timestamp")

    model_config = ConfigDict(from_attributes=True)


class DocumentUploadResponse(BaseModel):
    """Structured response returned by the document ingestion pipeline."""
    success: bool = True
    document: DocumentMetadata
    content: List[DocumentPage]

    model_config = ConfigDict(from_attributes=True)


class DocumentResponse(BaseModel):
    """Schema for document summaries returned by GET /api/v1/documents."""
    id: int
    filename: str
    file_type: str
    file_size: int
    total_pages: int
    character_count: int
    word_count: int
    document_summary: Optional[str] = None
    analysis_status: str = "uploaded"
    content_hash: Optional[str] = None
    created_at: datetime
    requirements_count: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)


class DocumentDetailResponse(DocumentResponse):
    """Schema for a single document with its requirements: GET /api/v1/documents/{document_id}."""
    requirements: List[RequirementItem] = []

