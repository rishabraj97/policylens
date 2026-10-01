import hashlib
import os
import re
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple
from fastapi import UploadFile, HTTPException, status
from sqlalchemy.orm import Session
import pymupdf

from app.models.compliance import Document
from app.schemas.documents import (
    DocumentPage,
    DocumentMetadata,
    DocumentUploadResponse,
)

# Constraints
MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024  # 25 MB
ALLOWED_EXTENSIONS = {".pdf", ".txt"}
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/x-pdf",
    "text/plain",
    "text/x-log",
    "application/octet-stream",  # Frequently sent by some browsers for raw txt/pdf
}

# Resolve uploads directory (root level uploads/ folder)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"


def normalize_text(text: str) -> str:
    """
    Normalizes extracted text:
    - Normalizes line breaks (\r\n -> \n, \r -> \n)
    - Strips trailing whitespace per line
    - Collapses excessive blank lines (3+ newlines to 2)
    - Preserves meaningful paragraph boundaries, page boundaries, and readable text
    """
    if not text:
        return ""

    # Replace carriage returns
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Clean non-printable control characters (preserve tabs and newlines)
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", text)

    # Strip trailing whitespace on each line
    lines = [line.rstrip() for line in text.split("\n")]
    cleaned_text = "\n".join(lines)

    # Collapse 3 or more consecutive newlines into 2 (paragraph boundary)
    cleaned_text = re.sub(r"\n{3,}", "\n\n", cleaned_text)

    return cleaned_text.strip()


def validate_file(file: UploadFile, file_bytes: bytes) -> Tuple[str, str]:
    """
    Validates file extension, size, and content.
    Returns (safe_filename, file_extension).
    Raises HTTPException for invalid inputs.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is missing or invalid.",
        )

    # Sanitize filename against path traversal
    safe_filename = os.path.basename(file.filename)
    extension = Path(safe_filename).suffix.lower()

    # Validate extension
    if extension not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type. Only PDF and TXT files are allowed.",
        )

    # Validate MIME type if provided and not generic
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file MIME type '{file.content_type}'. Only PDF and TXT files are allowed.",
        )

    # Validate file size
    file_size = len(file_bytes)
    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded file is empty.",
        )

    if file_size > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File exceeds the 25 MB limit.",
        )

    # Validate header signature for PDF files
    if extension == ".pdf" and not file_bytes.startswith(b"%PDF-"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid PDF format. The file content does not match a valid PDF signature.",
        )

    return safe_filename, extension


def save_upload(file_bytes: bytes, filename: str) -> Path:
    """
    Saves uploaded file bytes into the uploads directory with a collision-free safe name.
    """
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    safe_name = os.path.basename(filename)
    # Prefix with a short random uuid to avoid overwriting files with identical names
    unique_filename = f"{uuid.uuid4().hex[:8]}_{safe_name}"
    target_path = UPLOADS_DIR / unique_filename

    target_path.write_bytes(file_bytes)
    return target_path


def extract_pdf_text(file_bytes: bytes) -> List[DocumentPage]:
    """
    Extracts text page-by-page from a PDF byte stream using PyMuPDF.
    Maintains 1-indexed page boundaries.
    """
    pages: List[DocumentPage] = []
    doc = None

    try:
        doc = pymupdf.open(stream=file_bytes, filetype="pdf")

        if doc.is_encrypted:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Password-protected or encrypted PDFs are not supported.",
            )

        if doc.page_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The PDF document contains no readable pages.",
            )

        for page_idx in range(doc.page_count):
            page = doc.load_page(page_idx)
            raw_text = page.get_text()
            normalized = normalize_text(raw_text)
            pages.append(
                DocumentPage(
                    page=page_idx + 1,
                    text=normalized,
                )
            )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read or parse PDF document: {str(e)}",
        )
    finally:
        if doc:
            doc.close()

    return pages


def extract_txt_text(file_bytes: bytes) -> List[DocumentPage]:
    """
    Extracts text from a plain text byte stream, gracefully decoding UTF-8 or fallbacks.
    Returns a single page representing the document.
    """
    decoded_text = ""
    # Try UTF-8 first, fallback to common encodings
    for encoding in ("utf-8", "utf-8-sig", "latin-1", "cp1252"):
        try:
            decoded_text = file_bytes.decode(encoding)
            break
        except UnicodeDecodeError:
            continue

    if not decoded_text:
        # Fallback with replacement characters
        decoded_text = file_bytes.decode("utf-8", errors="replace")

    normalized = normalize_text(decoded_text)
    return [DocumentPage(page=1, text=normalized)]


# ---------------------------------------------------------------------------
# Database Service / CRUD for Documents
# ---------------------------------------------------------------------------

def create_document(
    db: Session,
    filename: str,
    file_type: str,
    file_size: int,
    total_pages: int,
    character_count: int,
    word_count: int,
    content_hash: Optional[str] = None,
    document_summary: Optional[str] = None,
    analysis_status: str = "uploaded",
) -> Document:
    """
    Creates and persists a Document record, with duplicate handling via content_hash.
    If a document with the exact content_hash exists, returns the existing record
    and updates analysis_status if requested.
    """
    if content_hash:
        existing = db.query(Document).filter(Document.content_hash == content_hash).first()
        if existing:
            existing.filename = filename
            existing.analysis_status = analysis_status
            if document_summary:
                existing.document_summary = document_summary
            db.commit()
            db.refresh(existing)
            return existing

    doc = Document(
        filename=filename,
        file_type=file_type,
        file_size=file_size,
        total_pages=total_pages,
        character_count=character_count,
        word_count=word_count,
        document_summary=document_summary,
        analysis_status=analysis_status,
        content_hash=content_hash,
        created_at=datetime.utcnow(),
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


def get_document(db: Session, document_id: int) -> Optional[Document]:
    """
    Fetches a single document by ID with its associated requirements.
    """
    return db.query(Document).filter(Document.id == document_id).first()


def get_document_by_hash(db: Session, content_hash: str) -> Optional[Document]:
    """
    Fetches a document by content hash.
    """
    return db.query(Document).filter(Document.content_hash == content_hash).first()


def get_all_documents(db: Session, skip: int = 0, limit: int = 100) -> List[Document]:
    """
    Fetches all documents ordered by creation time descending.
    """
    return (
        db.query(Document)
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def update_document_status(
    db: Session,
    document_id: int,
    status: str,
    document_summary: Optional[str] = None,
) -> Optional[Document]:
    """
    Updates the analysis status and optional summary of a document.
    """
    doc = get_document(db, document_id)
    if not doc:
        return None
    doc.analysis_status = status
    if document_summary is not None:
        doc.document_summary = document_summary
    db.commit()
    db.refresh(doc)
    return doc


def process_document(
    file: UploadFile,
    db: Optional[Session] = None,
) -> DocumentUploadResponse:
    """
    High-level ingestion pipeline:
    1. Reads bytes
    2. Validates file (extension, size, content)
    3. Saves temporary file in uploads/
    4. Extracts text page-by-page
    5. Normalizes text content
    6. Persists Document record in database if db session is provided
    7. Returns structured DocumentUploadResponse
    """
    try:
        file_bytes = file.file.read()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not read uploaded file content: {str(e)}",
        )

    safe_filename, extension = validate_file(file, file_bytes)

    # Save to uploads/ directory
    save_upload(file_bytes, safe_filename)

    # Extract text based on document type
    if extension == ".pdf":
        pages = extract_pdf_text(file_bytes)
        file_type = "pdf"
    elif extension == ".txt":
        pages = extract_txt_text(file_bytes)
        file_type = "txt"
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file type.",
        )

    total_chars = sum(len(p.text) for p in pages)
    total_words = sum(len(p.text.split()) for p in pages)
    content_hash = hashlib.sha256(file_bytes).hexdigest()

    doc_id: Optional[int] = None
    created_at = None
    analysis_status = "uploaded"

    if db is not None:
        doc = create_document(
            db=db,
            filename=safe_filename,
            file_type=file_type,
            file_size=len(file_bytes),
            total_pages=len(pages),
            character_count=total_chars,
            word_count=total_words,
            content_hash=content_hash,
            analysis_status="uploaded",
        )
        doc_id = doc.id
        created_at = doc.created_at
        analysis_status = doc.analysis_status

    metadata = DocumentMetadata(
        id=doc_id,
        filename=safe_filename,
        file_type=file_type,
        file_size=len(file_bytes),
        total_pages=len(pages),
        character_count=total_chars,
        word_count=total_words,
        analysis_status=analysis_status,
        content_hash=content_hash,
        created_at=created_at,
    )

    return DocumentUploadResponse(
        success=True,
        document=metadata,
        content=pages,
    )

