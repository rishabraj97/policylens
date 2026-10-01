"""
PolicyLens — Step 4 Database Persistence Tests
Validates database connection, CRUD operations, relationships, cascade deletes,
and endpoints using an isolated SQLite test database.
"""
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.core.database import Base, get_db
from app.main import app
from app.models.compliance import Document, Requirement
from app.services.document_service import (
    create_document,
    get_document,
    get_all_documents,
)
from app.services.requirement_service import (
    create_requirements,
    get_requirements,
    get_all_requirements,
    get_requirement_by_id,
    update_requirement_status,
)
from app.schemas.requirements import RequirementItem

# Isolated in-memory SQLite engine for testing
TEST_DATABASE_URL = "sqlite:///:memory:"

test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=test_engine,
)


@pytest.fixture(scope="function")
def db_session():
    """Creates a fresh test database schema for each test and tears it down afterwards."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def test_client(db_session):
    """FastAPI test client with get_db dependency overridden to test DB."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# 1. Database Connection
def test_database_connection(db_session):
    """Verifies test database connection and table creation."""
    assert db_session.is_active
    doc_count = db_session.query(Document).count()
    req_count = db_session.query(Requirement).count()
    assert doc_count == 0
    assert req_count == 0


# 2. Create Document
def test_create_document(db_session):
    """Verifies creating and persisting a Document record."""
    doc = create_document(
        db=db_session,
        filename="gdpr-policy.pdf",
        file_type="pdf",
        file_size=10240,
        total_pages=5,
        character_count=2400,
        word_count=350,
        content_hash="abc123hash",
        document_summary="Summary of GDPR policy obligations.",
        analysis_status="analyzed",
    )
    assert doc.id is not None
    assert doc.filename == "gdpr-policy.pdf"
    assert doc.file_type == "pdf"
    assert doc.file_size == 10240
    assert doc.total_pages == 5
    assert doc.analysis_status == "analyzed"
    assert doc.created_at is not None

    fetched = get_document(db_session, doc.id)
    assert fetched is not None
    assert fetched.filename == "gdpr-policy.pdf"


# 3. Create Requirement
def test_create_requirement(db_session):
    """Verifies creating and persisting requirements linked to a document."""
    doc = create_document(
        db=db_session,
        filename="security-guidelines.txt",
        file_type="txt",
        file_size=500,
        total_pages=1,
        character_count=400,
        word_count=60,
    )

    items = [
        RequirementItem(
            requirement="Encrypt all sensitive customer data at rest.",
            action="Enable AES-256 encryption on all production RDS databases.",
            applicability="Cloud infrastructure team",
            deadline="30 days from policy enactment",
            responsible_department="IT Security",
            evidence_required="AWS KMS key ARN and RDS encryption status report.",
            status="Pending",
            source_pages=[1],
            confidence=0.95,
        )
    ]

    saved = create_requirements(db_session, doc.id, items)
    assert len(saved) == 1
    assert saved[0].id is not None
    assert saved[0].document_id == doc.id
    assert saved[0].requirement == "Encrypt all sensitive customer data at rest."
    assert saved[0].responsible_department == "IT Security"
    assert saved[0].status == "Pending"
    assert saved[0].source_pages == [1]
    assert saved[0].confidence == 0.95


# 4. Document -> Requirements Relationship & Cascade
def test_document_requirements_relationship_and_cascade(db_session):
    """Verifies one-to-many relationship and cascade delete."""
    doc = create_document(
        db=db_session,
        filename="compliance.pdf",
        file_type="pdf",
        file_size=2000,
        total_pages=2,
        character_count=1000,
        word_count=150,
    )

    items = [
        RequirementItem(
            requirement=f"Requirement {i}",
            action=f"Action {i}",
            applicability="All staff",
            status="Needs Review",
            source_pages=[1],
            confidence=0.8,
        )
        for i in range(1, 4)
    ]
    create_requirements(db_session, doc.id, items)

    # Check relationship on document object
    db_session.refresh(doc)
    assert len(doc.requirements) == 3
    assert doc.requirements[0].document.id == doc.id

    # Cascade test: Deleting document should delete its requirements
    db_session.delete(doc)
    db_session.commit()

    remaining_reqs = db_session.query(Requirement).filter(Requirement.document_id == doc.id).all()
    assert len(remaining_reqs) == 0


# 5. Get Documents
def test_get_documents(db_session):
    """Verifies listing all documents."""
    for i in range(3):
        create_document(
            db=db_session,
            filename=f"doc_{i}.pdf",
            file_type="pdf",
            file_size=100 * (i + 1),
            total_pages=i + 1,
            character_count=500 * (i + 1),
            word_count=70 * (i + 1),
            content_hash=f"hash_{i}",
        )

    all_docs = get_all_documents(db_session)
    assert len(all_docs) == 3


# 6. Get Requirements (with filtering)
def test_get_requirements(db_session):
    """Verifies listing and filtering requirements."""
    doc1 = create_document(db=db_session, filename="doc1.pdf", file_type="pdf", file_size=100, total_pages=1, character_count=100, word_count=20)
    doc2 = create_document(db=db_session, filename="doc2.pdf", file_type="pdf", file_size=100, total_pages=1, character_count=100, word_count=20)

    create_requirements(
        db_session,
        doc1.id,
        [
            RequirementItem(requirement="R1", action="A1", applicability="all", status="Pending", source_pages=[1], confidence=0.9),
            RequirementItem(requirement="R2", action="A2", applicability="all", status="Completed", source_pages=[1], confidence=0.85),
        ],
    )
    create_requirements(
        db_session,
        doc2.id,
        [
            RequirementItem(requirement="R3", action="A3", applicability="all", status="Needs Review", source_pages=[1], confidence=0.75),
        ],
    )

    all_reqs = get_all_requirements(db_session)
    assert len(all_reqs) == 3

    # Filter by document_id
    doc1_reqs = get_requirements(db_session, document_id=doc1.id)
    assert len(doc1_reqs) == 2

    # Filter by status
    pending_reqs = get_requirements(db_session, status="Pending")
    assert len(pending_reqs) == 1
    assert pending_reqs[0].requirement == "R1"

    completed_reqs = get_requirements(db_session, status="Completed")
    assert len(completed_reqs) == 1
    assert completed_reqs[0].requirement == "R2"


# 7. Update Requirement Status
def test_update_requirement_status(db_session):
    """Verifies updating status from Pending to Completed and Needs Review."""
    doc = create_document(db=db_session, filename="test.pdf", file_type="pdf", file_size=100, total_pages=1, character_count=100, word_count=20)
    created = create_requirements(
        db_session,
        doc.id,
        [RequirementItem(requirement="R1", action="A1", applicability="all", status="Pending", source_pages=[1], confidence=0.9)],
    )
    req_id = created[0].id

    # Update to Completed
    updated = update_requirement_status(db_session, req_id, "Completed")
    assert updated is not None
    assert updated.status == "Completed"

    # Verify persistent in DB
    refetched = get_requirement_by_id(db_session, req_id)
    assert refetched.status == "Completed"

    # Update to Needs Review
    updated2 = update_requirement_status(db_session, req_id, "Needs Review")
    assert updated2.status == "Needs Review"


# 8. Invalid Requirement ID
def test_invalid_requirement_id(test_client):
    """Verifies that non-existent requirement ID returns 404."""
    response = test_client.patch(
        "/api/v1/requirements/99999/status",
        json={"status": "Completed"},
    )
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


# 9. Invalid Status
def test_invalid_status(test_client, db_session):
    """Verifies that an unsupported status is rejected with 422 Unprocessable Entity."""
    doc = create_document(db=db_session, filename="doc.pdf", file_type="pdf", file_size=100, total_pages=1, character_count=100, word_count=20)
    created = create_requirements(
        db_session,
        doc.id,
        [RequirementItem(requirement="R1", action="A1", applicability="all", status="Pending", source_pages=[1], confidence=0.9)],
    )
    req_id = created[0].id

    response = test_client.patch(
        f"/api/v1/requirements/{req_id}/status",
        json={"status": "ArbitraryNonExistentStatus"},
    )
    # Pydantic validation fails with 422
    assert response.status_code == 422


# 10. Empty Database
def test_empty_database(test_client):
    """Verifies empty database response for documents and requirements."""
    doc_res = test_client.get("/api/v1/documents")
    assert doc_res.status_code == 200
    assert doc_res.json() == []

    req_res = test_client.get("/api/v1/requirements")
    assert req_res.status_code == 200
    assert req_res.json() == []


# 11. Endpoints: GET /documents and GET /documents/{id}
def test_documents_endpoints(test_client, db_session):
    """Verifies GET /api/v1/documents and GET /api/v1/documents/{id}."""
    doc = create_document(
        db=db_session,
        filename="iso27001.pdf",
        file_type="pdf",
        file_size=5000,
        total_pages=3,
        character_count=1500,
        word_count=220,
        document_summary="ISO 27001 control guidelines.",
        analysis_status="analyzed",
    )
    create_requirements(
        db_session,
        doc.id,
        [
            RequirementItem(
                requirement="Access control policy",
                action="Define access control rules",
                applicability="All IT",
                status="Pending",
                source_pages=[1],
                confidence=0.9,
            )
        ],
    )

    # List documents
    res = test_client.get("/api/v1/documents")
    assert res.status_code == 200
    docs = res.json()
    assert len(docs) == 1
    assert docs[0]["filename"] == "iso27001.pdf"
    assert docs[0]["requirements_count"] == 1

    # Get single document
    detail_res = test_client.get(f"/api/v1/documents/{doc.id}")
    assert detail_res.status_code == 200
    detail = detail_res.json()
    assert detail["id"] == doc.id
    assert detail["filename"] == "iso27001.pdf"
    assert len(detail["requirements"]) == 1
    assert detail["requirements"][0]["requirement"] == "Access control policy"

    # Non-existent document 404
    not_found = test_client.get("/api/v1/documents/99999")
    assert not_found.status_code == 404
