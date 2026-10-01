"""
PolicyLens — Documents API Routes
Handles document upload (Step 2), AI analysis (Step 3), and Document persistence (Step 4).
"""
import logging
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.schemas.documents import (
    DocumentUploadResponse,
    DocumentResponse,
    DocumentDetailResponse,
)
from app.schemas.requirements import (
    AnalyzeRequest,
    DocumentAnalysisResponse,
    RequirementItem,
)
from app.services.document_service import (
    process_document,
    create_document,
    get_document,
    get_document_by_hash,
    get_all_documents,
)
from app.services.requirement_service import create_requirements
from app.services.ai_service import analyze_document

logger = logging.getLogger("policylens.routes.documents")

router = APIRouter(prefix="/documents", tags=["Documents"])


@router.post(
    "/upload",
    response_model=DocumentUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload and ingest a policy document",
    description=(
        "Accepts a PDF or TXT file up to 25MB, validates format, "
        "extracts page-by-page text, persists document record in database, "
        "and returns normalized content."
    ),
)
async def upload_document(
    file: UploadFile = File(..., description="PDF or TXT policy document to ingest"),
    db: Session = Depends(get_db),
) -> DocumentUploadResponse:
    """
    Ingests and normalizes an uploaded policy document, persisting metadata.
    """
    return process_document(file, db=db)


@router.post(
    "/analyze",
    response_model=DocumentAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="AI-powered compliance requirement extraction",
    description=(
        "Accepts page-structured document content (as produced by /upload) and "
        "uses an AI model to identify actionable compliance requirements. "
        "Persists the document record and decomposed requirements into the database. "
        "Returns structured, database-backed JSON with requirements, actions, deadlines, "
        "departments, evidence requirements, source pages, and confidence scores."
    ),
)
async def analyze_document_endpoint(
    body: AnalyzeRequest,
    db: Session = Depends(get_db),
) -> DocumentAnalysisResponse:
    """
    Analyses extracted document pages, extracts compliance obligations via AI,
    persists records into SQLite database, and returns the persisted results.
    """
    filename = body.filename or "unknown_document"
    pages = body.pages

    logger.info(
        "[Route] /analyze called — file=%s pages=%d",
        filename,
        len(pages),
    )

    if not pages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No document pages provided. Upload a document first.",
        )

    # Filter out pages with no content
    non_empty_pages = [p for p in pages if (p.get("text") or "").strip()]
    if not non_empty_pages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Document contains no extractable text content.",
        )

    # Step 4 Flow: Ingest/Fetch Document record in DB
    doc = None
    if body.document_id:
        doc = get_document(db, body.document_id)

    if not doc and body.content_hash:
        doc = get_document_by_hash(db, body.content_hash)

    if not doc:
        # Create Document record before running AI analysis
        total_chars = sum(len(p.get("text", "")) for p in pages)
        total_words = sum(len(p.get("text", "").split()) for p in pages)
        file_type = "pdf" if filename.lower().endswith(".pdf") else "txt"
        doc = create_document(
            db=db,
            filename=filename,
            file_type=file_type,
            file_size=0,
            total_pages=len(pages),
            character_count=total_chars,
            word_count=total_words,
            content_hash=body.content_hash,
            analysis_status="processing",
        )
    else:
        doc.analysis_status = "processing"
        db.commit()

    # Run AI requirement decomposition
    try:
        result = analyze_document(document_pages=pages, filename=filename)
    except Exception as e:
        logger.exception("[Route] AI analysis failed for document %s: %s", doc.id, str(e))
        doc.analysis_status = "failed"
        db.commit()
        raise

    # AI succeeded: update document metadata and status to 'analyzed'
    doc.analysis_status = "analyzed"
    doc.document_summary = result.document_summary
    db.commit()
    db.refresh(doc)

    # Persist extracted requirements into database
    db_requirements = create_requirements(
        db=db,
        document_id=doc.id,
        requirements=result.requirements,
    )

    persisted_items = [RequirementItem.model_validate(r) for r in db_requirements]

    logger.info(
        "[Route] /analyze complete & persisted — doc_id=%d file=%s requirements=%d",
        doc.id,
        filename,
        len(persisted_items),
    )

    return DocumentAnalysisResponse(
        success=True,
        document_id=doc.id,
        filename=doc.filename,
        document_summary=doc.document_summary,
        requirements=persisted_items,
    )


@router.get(
    "",
    response_model=List[DocumentResponse],
    status_code=status.HTTP_200_OK,
    summary="List all analyzed documents",
    description="Returns all policy documents in the database with their metadata and requirements count.",
)
def get_documents_endpoint(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> List[DocumentResponse]:
    """
    Returns list of analyzed documents from the database.
    """
    docs = get_all_documents(db, skip=skip, limit=limit)
    response_items: List[DocumentResponse] = []
    for doc in docs:
        response_items.append(
            DocumentResponse(
                id=doc.id,
                filename=doc.filename,
                file_type=doc.file_type,
                file_size=doc.file_size,
                total_pages=doc.total_pages,
                character_count=doc.character_count,
                word_count=doc.word_count,
                document_summary=doc.document_summary,
                analysis_status=doc.analysis_status,
                content_hash=doc.content_hash,
                created_at=doc.created_at,
                requirements_count=len(doc.requirements) if doc.requirements else 0,
            )
        )
    return response_items


@router.get(
    "/{document_id}",
    response_model=DocumentDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get document details and its requirements",
    description="Returns a specific document with its full list of compliance requirements.",
)
def get_document_by_id_endpoint(
    document_id: int,
    db: Session = Depends(get_db),
) -> DocumentDetailResponse:
    """
    Returns a single document and its associated compliance requirements.
    """
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found.",
        )

    return DocumentDetailResponse(
        id=doc.id,
        filename=doc.filename,
        file_type=doc.file_type,
        file_size=doc.file_size,
        total_pages=doc.total_pages,
        character_count=doc.character_count,
        word_count=doc.word_count,
        document_summary=doc.document_summary,
        analysis_status=doc.analysis_status,
        content_hash=doc.content_hash,
        created_at=doc.created_at,
        requirements_count=len(doc.requirements) if doc.requirements else 0,
        requirements=[RequirementItem.model_validate(r) for r in doc.requirements],
    )

