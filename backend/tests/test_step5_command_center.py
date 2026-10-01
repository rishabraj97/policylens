"""
PolicyLens — Step 5 Compliance Command Center Tests
Validates:
1. Get documents
2. Get document by ID
3. Get requirements
4. Update requirement status
5. Invalid requirement ID
6. Invalid document ID
7. Dashboard statistics
8. Deadline classification
9. Empty database
10. Requirement filtering
"""
from datetime import date, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models.compliance import Document, Requirement
from app.schemas.requirements import RequirementItem
from app.services.deadline_service import (
    classify_deadline,
    parse_deadline_date,
    OVERDUE,
    DUE_SOON,
    UPCOMING,
    NO_DEADLINE,
)
from app.services.document_service import create_document
from app.services.requirement_service import create_requirements, update_requirement_status

# Isolated in-memory SQLite engine
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
    """Fresh in-memory DB per test."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def test_client(db_session):
    """FastAPI test client with DB override."""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# 1. Get Documents
# ---------------------------------------------------------------------------
def test_get_documents(test_client, db_session):
    """Test 1: GET /api/v1/documents returns list of documents with metadata."""
    doc = create_document(
        db=db_session,
        filename="cyber-security.pdf",
        file_type="pdf",
        file_size=2048,
        total_pages=4,
        character_count=1200,
        word_count=180,
        document_summary="Cybersecurity governance framework.",
        analysis_status="analyzed",
    )
    res = test_client.get("/api/v1/documents")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["id"] == doc.id
    assert data[0]["filename"] == "cyber-security.pdf"
    assert data[0]["file_type"] == "pdf"


# ---------------------------------------------------------------------------
# 2. Get Document by ID
# ---------------------------------------------------------------------------
def test_get_document_by_id(test_client, db_session):
    """Test 2: GET /api/v1/documents/{id} returns document details with requirements."""
    doc = create_document(
        db=db_session,
        filename="data-retention.pdf",
        file_type="pdf",
        file_size=1024,
        total_pages=2,
        character_count=500,
        word_count=80,
    )
    create_requirements(
        db_session,
        doc.id,
        [
            RequirementItem(
                requirement="Retain financial logs for 7 years.",
                action="Configure automated S3 lifecycle policy.",
                applicability="Finance & IT",
                deadline="2026-12-31",
                responsible_department="Finance",
                evidence_required="AWS S3 bucket configuration screenshot.",
                status="Pending",
                source_pages=[1, 2],
                confidence=0.92,
            )
        ],
    )

    res = test_client.get(f"/api/v1/documents/{doc.id}")
    assert res.status_code == 200
    body = res.json()
    assert body["id"] == doc.id
    assert body["filename"] == "data-retention.pdf"
    assert len(body["requirements"]) == 1
    assert body["requirements"][0]["requirement"] == "Retain financial logs for 7 years."
    assert body["requirements"][0]["confidence"] == 0.92


# ---------------------------------------------------------------------------
# 3. Get Requirements
# ---------------------------------------------------------------------------
def test_get_requirements(test_client, db_session):
    """Test 3: GET /api/v1/requirements returns list of all requirements."""
    doc = create_document(db=db_session, filename="doc.pdf", file_type="pdf", file_size=100, total_pages=1, character_count=100, word_count=20)
    create_requirements(
        db_session,
        doc.id,
        [
            RequirementItem(requirement="Req 1", action="Act 1", applicability="all", status="Pending", source_pages=[1], confidence=0.8),
            RequirementItem(requirement="Req 2", action="Act 2", applicability="all", status="Completed", source_pages=[1], confidence=0.95),
        ],
    )
    res = test_client.get("/api/v1/requirements")
    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2


# ---------------------------------------------------------------------------
# 4. Update Requirement Status
# ---------------------------------------------------------------------------
def test_update_requirement_status(test_client, db_session):
    """Test 4: PATCH /api/v1/requirements/{id}/status updates status and persists."""
    doc = create_document(db=db_session, filename="doc.pdf", file_type="pdf", file_size=100, total_pages=1, character_count=100, word_count=20)
    reqs = create_requirements(
        db_session,
        doc.id,
        [RequirementItem(requirement="Req 1", action="Act 1", applicability="all", status="Pending", source_pages=[1], confidence=0.8)],
    )
    req_id = reqs[0].id

    # Update to Completed
    res = test_client.patch(f"/api/v1/requirements/{req_id}/status", json={"status": "Completed"})
    assert res.status_code == 200
    assert res.json()["status"] == "Completed"

    # Verify via GET
    get_res = test_client.get(f"/api/v1/requirements/{req_id}")
    assert get_res.status_code == 200
    assert get_res.json()["status"] == "Completed"


# ---------------------------------------------------------------------------
# 5. Invalid Requirement ID
# ---------------------------------------------------------------------------
def test_invalid_requirement_id(test_client):
    """Test 5: Non-existent requirement returns 404 for GET and PATCH."""
    res_get = test_client.get("/api/v1/requirements/99999")
    assert res_get.status_code == 404

    res_patch = test_client.patch("/api/v1/requirements/99999/status", json={"status": "Completed"})
    assert res_patch.status_code == 404


# ---------------------------------------------------------------------------
# 6. Invalid Document ID
# ---------------------------------------------------------------------------
def test_invalid_document_id(test_client):
    """Test 6: Non-existent document returns 404."""
    res = test_client.get("/api/v1/documents/99999")
    assert res.status_code == 404


# ---------------------------------------------------------------------------
# 7. Dashboard Statistics
# ---------------------------------------------------------------------------
def test_dashboard_statistics(test_client, db_session):
    """Test 7: GET /api/v1/dashboard/stats computes correct statistics, score, and deadline breakdown."""
    doc = create_document(db=db_session, filename="policy.pdf", file_type="pdf", file_size=100, total_pages=1, character_count=100, word_count=20)

    today = date.today()
    past_date = (today - timedelta(days=10)).isoformat()
    soon_date = (today + timedelta(days=3)).isoformat()
    future_date = (today + timedelta(days=30)).isoformat()

    items = [
        # Overdue (pending + past date)
        RequirementItem(requirement="Req Overdue 1", action="Act", applicability="all", deadline=past_date, status="Pending", source_pages=[1], confidence=0.9),
        RequirementItem(requirement="Req Overdue 2", action="Act", applicability="all", deadline=past_date, status="Needs Review", source_pages=[1], confidence=0.85),
        # Due soon (pending + within 7 days)
        RequirementItem(requirement="Req Soon", action="Act", applicability="all", deadline=soon_date, status="Pending", source_pages=[1], confidence=0.88),
        # Upcoming (pending + > 7 days)
        RequirementItem(requirement="Req Future", action="Act", applicability="all", deadline=future_date, status="Pending", source_pages=[1], confidence=0.9),
        # No deadline (unspecified)
        RequirementItem(requirement="Req No DL", action="Act", applicability="all", deadline="Not specified", status="Needs Review", source_pages=[1], confidence=0.8),
        # Completed with past date (must NOT be counted as overdue)
        RequirementItem(requirement="Req Completed", action="Act", applicability="all", deadline=past_date, status="Completed", source_pages=[1], confidence=0.95),
    ]
    create_requirements(db_session, doc.id, items)

    res = test_client.get("/api/v1/dashboard/stats")
    assert res.status_code == 200
    stats = res.json()

    assert stats["total"] == 6
    assert stats["pending"] == 3
    assert stats["needs_review"] == 2
    assert stats["completed"] == 1
    # Compliance score = 1 / 6 * 100 = 16.67
    assert stats["compliance_score"] == 16.67
    assert stats["overdue"] == 2  # Req Overdue 1 and Req Overdue 2 only
    assert stats["due_soon"] == 1  # Req Soon
    assert stats["upcoming"] == 1  # Req Future
    # Req No DL + Req Completed (completed with past date is not active overdue, safely in no_deadline)
    assert stats["no_deadline"] == 2


# ---------------------------------------------------------------------------
# 8. Deadline Classification
# ---------------------------------------------------------------------------
def test_deadline_classification():
    """Test 8: Unit test for classify_deadline and parse_deadline_date helper."""
    today = date(2026, 10, 1)

    # 1. Overdue
    assert classify_deadline("2026-09-20", status="Pending", ref_date=today) == OVERDUE
    assert classify_deadline("2026-09-20", status="Needs Review", ref_date=today) == OVERDUE

    # 2. Section 32 interaction: Completed + old deadline -> not overdue
    assert classify_deadline("2026-09-20", status="Completed", ref_date=today) == NO_DEADLINE

    # 3. Due soon (today or within 7 days)
    assert classify_deadline("2026-10-01", status="Pending", ref_date=today) == DUE_SOON
    assert classify_deadline("2026-10-05", status="Pending", ref_date=today) == DUE_SOON
    assert classify_deadline("2026-10-08", status="Pending", ref_date=today) == DUE_SOON

    # 4. Upcoming (> 7 days)
    assert classify_deadline("2026-10-15", status="Pending", ref_date=today) == UPCOMING
    assert classify_deadline("2027-01-01", status="Pending", ref_date=today) == UPCOMING

    # 5. Non-date text / free-text / safe non-guessing
    assert classify_deadline("Not specified", status="Pending", ref_date=today) == NO_DEADLINE
    assert classify_deadline("Within 30 days of notice", status="Pending", ref_date=today) == NO_DEADLINE
    assert classify_deadline(None, status="Pending", ref_date=today) == NO_DEADLINE
    assert classify_deadline("Ongoing", status="Pending", ref_date=today) == NO_DEADLINE
    assert classify_deadline("Immediately", status="Pending", ref_date=today) == NO_DEADLINE


# ---------------------------------------------------------------------------
# 9. Empty Database
# ---------------------------------------------------------------------------
def test_empty_database(test_client):
    """Test 9: Empty DB returns empty lists and clean zeroed statistics without errors."""
    doc_res = test_client.get("/api/v1/documents")
    assert doc_res.status_code == 200
    assert doc_res.json() == []

    req_res = test_client.get("/api/v1/requirements")
    assert req_res.status_code == 200
    assert req_res.json() == []

    stats_res = test_client.get("/api/v1/dashboard/stats")
    assert stats_res.status_code == 200
    stats = stats_res.json()
    assert stats["total"] == 0
    assert stats["compliance_score"] == 0.0
    assert stats["pending"] == 0
    assert stats["completed"] == 0
    assert stats["needs_review"] == 0
    assert stats["overdue"] == 0
    assert stats["due_soon"] == 0
    assert stats["upcoming"] == 0
    assert stats["no_deadline"] == 0


# ---------------------------------------------------------------------------
# 10. Requirement Filtering
# ---------------------------------------------------------------------------
def test_requirement_filtering(test_client, db_session):
    """Test 10: Filtering requirements by document_id and status."""
    doc1 = create_document(db=db_session, filename="d1.pdf", file_type="pdf", file_size=100, total_pages=1, character_count=100, word_count=20)
    doc2 = create_document(db=db_session, filename="d2.pdf", file_type="pdf", file_size=100, total_pages=1, character_count=100, word_count=20)

    create_requirements(
        db_session,
        doc1.id,
        [
            RequirementItem(requirement="R1", action="A", applicability="all", status="Pending", source_pages=[1], confidence=0.9),
            RequirementItem(requirement="R2", action="A", applicability="all", status="Completed", source_pages=[1], confidence=0.8),
        ],
    )
    create_requirements(
        db_session,
        doc2.id,
        [
            RequirementItem(requirement="R3", action="A", applicability="all", status="Needs Review", source_pages=[1], confidence=0.7),
        ],
    )

    # Filter by document_id
    res_doc1 = test_client.get(f"/api/v1/requirements?document_id={doc1.id}")
    assert res_doc1.status_code == 200
    assert len(res_doc1.json()) == 2

    res_doc2 = test_client.get(f"/api/v1/requirements?document_id={doc2.id}")
    assert res_doc2.status_code == 200
    assert len(res_doc2.json()) == 1

    # Filter by status
    res_pending = test_client.get("/api/v1/requirements?status=Pending")
    assert res_pending.status_code == 200
    assert len(res_pending.json()) == 1
    assert res_pending.json()[0]["requirement"] == "R1"

    res_completed = test_client.get("/api/v1/requirements?status=Completed")
    assert res_completed.status_code == 200
    assert len(res_completed.json()) == 1
    assert res_completed.json()[0]["requirement"] == "R2"
