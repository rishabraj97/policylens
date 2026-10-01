from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Float,
    DateTime,
    ForeignKey,
    JSON,
    Boolean,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


class Document(Base):
    """
    Document ORM model for storing uploaded policy documents, metadata,
    and analysis status.
    """
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    filename = Column(String(255), nullable=False)
    file_type = Column(String(50), nullable=False)
    file_size = Column(Integer, nullable=False, default=0)
    total_pages = Column(Integer, nullable=False, default=1)
    character_count = Column(Integer, nullable=False, default=0)
    word_count = Column(Integer, nullable=False, default=0)
    document_summary = Column(Text, nullable=True)
    analysis_status = Column(String(50), nullable=False, default="uploaded")  # uploaded, processing, analyzed, failed
    content_hash = Column(String(64), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # One document can contain many requirements. Cascade delete preserves integrity.
    requirements = relationship(
        "Requirement",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="Requirement.id",
    )

    # RAG document chunks for chatbot
    chunks = relationship(
        "DocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
        order_by="DocumentChunk.chunk_index",
    )


class Requirement(Base):
    """
    Compliance Requirement ORM model representing actionable compliance obligations
    extracted from a policy document.
    """
    __tablename__ = "requirements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    requirement = Column(Text, nullable=False)
    action = Column(Text, nullable=False)
    applicability = Column(String(255), nullable=True, default="All")
    deadline = Column(String(100), nullable=True, default="Not specified")
    responsible_department = Column(String(100), nullable=False, default="Not specified")
    evidence_required = Column(Text, nullable=True, default="Not specified")
    status = Column(String(50), nullable=False, default="Pending")  # Pending, Needs Review, Completed
    source_pages = Column(JSON, nullable=False, default=list)  # Stored as JSON array [1, 2]
    confidence = Column(Float, nullable=False, default=1.0)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationship back to parent document
    document = relationship("Document", back_populates="requirements")

    # Compatibility properties for legacy / frontend access
    @property
    def department(self) -> str:
        return self.responsible_department

    @property
    def evidence(self) -> str:
        return self.evidence_required or ""

    @property
    def title(self) -> str:
        return self.requirement


class DocumentChunk(Base):
    """
    DocumentChunk ORM model for storing RAG text chunks.
    Each chunk preserves the page number for source citation.
    Embeddings are stored in a local NumPy file referenced by embedding_path.
    """
    __tablename__ = "document_chunks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    document_id = Column(
        Integer,
        ForeignKey("documents.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    chunk_index = Column(Integer, nullable=False)
    page_number = Column(Integer, nullable=False)
    text = Column(Text, nullable=False)
    # Embeddings are stored on disk; this path resolves to the .npy file
    embedding_path = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    document = relationship("Document", back_populates="chunks")
