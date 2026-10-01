"""
PolicyLens - Chat API Routes (Step 6)
Endpoints for document-grounded conversational AI (PolicyLens AI).
"""
import logging
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.services.document_service import get_document
from app.services.rag_service import (
    index_document,
    chat_with_document,
    get_rag_status,
    chunk_document_for_rag,
)

logger = logging.getLogger("policylens.routes.chat")

router = APIRouter(prefix="/documents", tags=["Chat"])


# ---------------------------------------------------------------------------
# Pydantic request/response schemas
# ---------------------------------------------------------------------------

class ConversationMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="User question")
    conversation_history: Optional[List[ConversationMessage]] = Field(
        default=None,
        description="Recent conversation history for context"
    )


class SourceChunk(BaseModel):
    page: int
    text: str
    relevance: float


class ChatResponse(BaseModel):
    message: str
    answer: str
    sources: List[SourceChunk]
    confidence: float
    grounded: bool


class IndexResponse(BaseModel):
    success: bool
    document_id: int
    chunks_created: int
    rag_status: str
    message: str


class RagStatusResponse(BaseModel):
    document_id: int
    rag_status: str
    chunk_count: int


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/{document_id}/chat",
    response_model=ChatResponse,
    status_code=status.HTTP_200_OK,
    summary="Chat with a document using PolicyLens AI",
    description=(
        "Document-grounded conversational AI. Retrieves relevant chunks via "
        "RAG, builds a grounded prompt, and returns an answer with source citations."
    ),
)
async def chat_with_document_endpoint(
    document_id: int,
    body: ChatRequest,
    db: Session = Depends(get_db),
) -> ChatResponse:
    """
    PolicyLens AI chatbot endpoint.
    Answers questions ONLY using the selected document's content.
    """
    # Validate document exists
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found.",
        )

    # Convert conversation history to plain dicts
    history_dicts = []
    if body.conversation_history:
        for msg in body.conversation_history:
            history_dicts.append({"role": msg.role, "content": msg.content})

    logger.info(
        "[Chat] Received message for doc_id=%d: %s...",
        document_id,
        body.message[:80],
    )

    # Run RAG chat pipeline
    result = chat_with_document(
        db=db,
        document_id=document_id,
        user_message=body.message,
        conversation_history=history_dicts,
    )

    sources = [
        SourceChunk(
            page=s["page"],
            text=s["text"],
            relevance=s["relevance"],
        )
        for s in result["sources"]
    ]

    return ChatResponse(
        message=result["message"],
        answer=result["answer"],
        sources=sources,
        confidence=result["confidence"],
        grounded=result["grounded"],
    )


@router.post(
    "/{document_id}/index",
    response_model=IndexResponse,
    status_code=status.HTTP_200_OK,
    summary="Index a document for RAG",
    description=(
        "Creates the RAG index for a document by chunking its text and "
        "generating embeddings. Safe to call multiple times (idempotent)."
    ),
)
async def index_document_endpoint(
    document_id: int,
    db: Session = Depends(get_db),
) -> IndexResponse:
    """
    Triggers RAG indexing for a document.
    Requires the document to have been previously uploaded and analyzed.
    """
    from app.models.compliance import DocumentChunk

    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found.",
        )

    # Re-fetch document pages from DB chunks OR from requirements source_pages
    # We need the original page text - stored during upload in the analysis pipeline
    # Since pages aren't stored post-upload, we reconstruct from existing chunks or
    # trigger a re-index request from the frontend with pages data.
    # For now, check if chunks exist and return status.
    existing_chunks = db.query(DocumentChunk).filter(DocumentChunk.document_id == document_id).count()

    if existing_chunks > 0:
        rag_status = get_rag_status(db, document_id)
        return IndexResponse(
            success=True,
            document_id=document_id,
            chunks_created=existing_chunks,
            rag_status=rag_status,
            message=f"Document is already indexed with {existing_chunks} chunks.",
        )

    return IndexResponse(
        success=False,
        document_id=document_id,
        chunks_created=0,
        rag_status="unavailable",
        message=(
            "Document pages are needed for indexing. "
            "Use POST /documents/{id}/index-with-pages to provide page content."
        ),
    )


class IndexWithPagesRequest(BaseModel):
    pages: List[Dict[str, Any]] = Field(
        ..., description="List of {page: int, text: str} dicts from upload pipeline"
    )


@router.post(
    "/{document_id}/index-with-pages",
    response_model=IndexResponse,
    status_code=status.HTTP_200_OK,
    summary="Index a document for RAG using provided page content",
    description=(
        "Creates the RAG index using provided page-structured text. "
        "Called automatically after document analysis."
    ),
)
async def index_document_with_pages_endpoint(
    document_id: int,
    body: IndexWithPagesRequest,
    db: Session = Depends(get_db),
) -> IndexResponse:
    """
    Indexes a document with provided page content.
    Called from the frontend after document upload + analysis.
    """
    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found.",
        )

    if not body.pages:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No pages provided for indexing.",
        )

    logger.info(
        "[Chat] Indexing doc_id=%d with %d pages for RAG.",
        document_id,
        len(body.pages),
    )

    try:
        chunks_created = index_document(
            db=db,
            document=doc,
            pages=body.pages,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("[Chat] Indexing failed for doc_id=%d: %s", document_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Indexing failed: {str(exc)}",
        )

    rag_status = get_rag_status(db, document_id)

    return IndexResponse(
        success=True,
        document_id=document_id,
        chunks_created=chunks_created,
        rag_status=rag_status,
        message=f"Successfully indexed {chunks_created} chunks for PolicyLens AI.",
    )


@router.get(
    "/{document_id}/rag-status",
    response_model=RagStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Get RAG index status for a document",
    description="Returns whether a document has been indexed for PolicyLens AI.",
)
def get_rag_status_endpoint(
    document_id: int,
    db: Session = Depends(get_db),
) -> RagStatusResponse:
    """Returns RAG indexing status: ready, indexing, or unavailable."""
    from app.models.compliance import DocumentChunk

    doc = get_document(db, document_id)
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Document with ID {document_id} not found.",
        )

    rag_status = get_rag_status(db, document_id)
    chunk_count = (
        db.query(DocumentChunk)
        .filter(DocumentChunk.document_id == document_id)
        .count()
    )

    return RagStatusResponse(
        document_id=document_id,
        rag_status=rag_status,
        chunk_count=chunk_count,
    )
