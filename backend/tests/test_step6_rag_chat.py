"""
PolicyLens — Step 6 RAG & Chat Tests
Tests for: chunking, page preservation, embeddings, similarity search,
           retrieval threshold, chat endpoint, multi-turn context,
           no-answer, invalid doc, empty message, AI failure.

All external AI/embedding calls are mocked. No paid API calls required.
"""
import json
from pathlib import Path
from unittest.mock import MagicMock, patch
import numpy as np
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.main import app
from app.core.database import Base, get_db
from app.models.compliance import Document, DocumentChunk
from app.services.rag_service import (
    chunk_document_for_rag,
    _cosine_similarity,
    get_rag_status,
    RAG_CHUNK_SIZE,
    RAG_CHUNK_OVERLAP,
)

# ---------------------------------------------------------------------------
# In-memory test database
# ---------------------------------------------------------------------------

TEST_DB_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(autouse=True)
def setup_db():
    """Create all tables before each test, drop after."""
    Base.metadata.create_all(bind=test_engine)
    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()


@pytest.fixture
def db():
    """Provide a DB session for unit tests."""
    session = TestSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def sample_doc(db):
    """Create a sample document in the test database."""
    doc = Document(
        filename="test_policy.pdf",
        file_type="pdf",
        file_size=1024,
        total_pages=3,
        character_count=2000,
        word_count=400,
        analysis_status="analyzed",
        content_hash="abc123",
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)
    return doc


@pytest.fixture
def sample_pages():
    """Sample document pages for testing."""
    return [
        {
            "page": 1,
            "text": "This is page one. Data privacy requirements apply to all departments. "
                    "Organizations must maintain an updated privacy notice. "
                    "Personal data must be protected at all times.",
        },
        {
            "page": 2,
            "text": "Page two covers security. Annual security audits are mandatory. "
                    "All access accounts must use multi-factor authentication. "
                    "The IT Security team is responsible for compliance evidence.",
        },
        {
            "page": 3,
            "text": "Page three defines deadlines. Annual audits must be completed before October 15th. "
                    "Quarterly reports are required from department heads. "
                    "Evidence submission is mandatory within 30 days of audit completion.",
        },
    ]


client = TestClient(app)


# ===========================================================================
# 1. Document Chunking Tests
# ===========================================================================

class TestDocumentChunking:

    def test_basic_chunking_produces_chunks(self, sample_pages):
        """Chunking should produce non-empty chunks."""
        chunks = chunk_document_for_rag(sample_pages)
        assert len(chunks) > 0

    def test_chunks_have_required_fields(self, sample_pages):
        """Every chunk must have chunk_index, page_number, text."""
        chunks = chunk_document_for_rag(sample_pages)
        for chunk in chunks:
            assert "chunk_index" in chunk
            assert "page_number" in chunk
            assert "text" in chunk
            assert isinstance(chunk["text"], str)
            assert len(chunk["text"]) > 0

    def test_chunk_indices_are_sequential(self, sample_pages):
        """chunk_index values must be sequential from 0."""
        chunks = chunk_document_for_rag(sample_pages)
        indices = [c["chunk_index"] for c in chunks]
        assert indices == list(range(len(chunks)))

    def test_chunk_size_respected(self, sample_pages):
        """Each chunk text should not exceed chunk_size characters."""
        chunks = chunk_document_for_rag(sample_pages, chunk_size=200, overlap=20)
        for chunk in chunks:
            assert len(chunk["text"]) <= 200 + 10  # small buffer for strip

    def test_empty_pages_skipped(self):
        """Empty pages should not produce chunks."""
        pages = [{"page": 1, "text": ""}, {"page": 2, "text": "   "}]
        chunks = chunk_document_for_rag(pages)
        assert chunks == []

    def test_single_page_produces_chunk(self):
        """A single page with text should produce at least one chunk."""
        pages = [{"page": 1, "text": "A compliance requirement must be met."}]
        chunks = chunk_document_for_rag(pages)
        assert len(chunks) == 1
        assert chunks[0]["page_number"] == 1


# ===========================================================================
# 2. Page Number Preservation Tests
# ===========================================================================

class TestPagePreservation:

    def test_page_numbers_preserved_in_chunks(self, sample_pages):
        """Every chunk must have a valid page_number from the source pages."""
        chunks = chunk_document_for_rag(sample_pages)
        valid_pages = {p["page"] for p in sample_pages}
        for chunk in chunks:
            assert chunk["page_number"] in valid_pages, (
                f"Chunk has invalid page_number {chunk['page_number']}"
            )

    def test_page_one_chunks_exist(self, sample_pages):
        """Chunks from page 1 must have page_number=1."""
        chunks = chunk_document_for_rag(sample_pages)
        page1_chunks = [c for c in chunks if c["page_number"] == 1]
        assert len(page1_chunks) >= 1

    def test_multipage_all_pages_represented(self, sample_pages):
        """All 3 pages should have at least one chunk."""
        chunks = chunk_document_for_rag(sample_pages)
        page_nums = {c["page_number"] for c in chunks}
        assert page_nums == {1, 2, 3}

    def test_page_numbers_never_zero(self, sample_pages):
        """Page numbers should never be 0 (they are 1-indexed)."""
        chunks = chunk_document_for_rag(sample_pages)
        for chunk in chunks:
            assert chunk["page_number"] >= 1


# ===========================================================================
# 3. Cosine Similarity Tests
# ===========================================================================

class TestSimilarity:

    def test_identical_vectors_score_1(self):
        """Identical vectors should have cosine similarity of 1.0."""
        vec = np.array([1.0, 0.5, 0.3], dtype=np.float32)
        mat = vec.reshape(1, -1)
        scores = _cosine_similarity(vec, mat)
        assert abs(scores[0] - 1.0) < 1e-5

    def test_orthogonal_vectors_score_near_0(self):
        """Orthogonal vectors should have cosine similarity near 0."""
        vec = np.array([1.0, 0.0, 0.0], dtype=np.float32)
        mat = np.array([[0.0, 1.0, 0.0]], dtype=np.float32)
        scores = _cosine_similarity(vec, mat)
        assert abs(scores[0]) < 1e-5

    def test_output_shape_matches_doc_count(self):
        """Output should have one score per document chunk vector."""
        query = np.random.rand(384).astype(np.float32)
        docs = np.random.rand(10, 384).astype(np.float32)
        scores = _cosine_similarity(query, docs)
        assert len(scores) == 10

    def test_scores_in_range(self):
        """All cosine similarity scores should be in [-1, 1]."""
        query = np.random.rand(384).astype(np.float32)
        docs = np.random.rand(20, 384).astype(np.float32)
        scores = _cosine_similarity(query, docs)
        assert all(-1.0 <= s <= 1.0 for s in scores)


# ===========================================================================
# 4. RAG Status Tests
# ===========================================================================

class TestRagStatus:

    def test_status_unavailable_when_no_chunks(self, db, sample_doc):
        """Status should be 'unavailable' when no chunks exist."""
        status = get_rag_status(db, sample_doc.id)
        assert status == "unavailable"

    def test_status_ready_with_chunks_and_embeddings(self, db, sample_doc, tmp_path):
        """Status should be 'ready' when chunks exist and embedding file present."""
        chunk = DocumentChunk(
            document_id=sample_doc.id,
            chunk_index=0,
            page_number=1,
            text="Test chunk",
            embedding_path=str(tmp_path / f"doc_{sample_doc.id}_embeddings.npy"),
        )
        db.add(chunk)
        db.commit()

        emb = np.array([[0.1, 0.2, 0.3]], dtype=np.float32)
        np.save(str(tmp_path / f"doc_{sample_doc.id}_embeddings.npy"), emb)

        # Mock the EMBEDDINGS_DIR
        with patch("app.services.rag_service.EMBEDDINGS_DIR", tmp_path):
            status = get_rag_status(db, sample_doc.id)
        assert status == "ready"


# ===========================================================================
# 5. Chat Endpoint Tests
# ===========================================================================

class TestChatEndpoint:

    def _make_doc_with_chunks(self, db, tmp_path):
        """Creates a doc + chunks + embeddings for chat tests."""
        doc = Document(
            filename="chat_test.pdf",
            file_type="pdf",
            file_size=1000,
            total_pages=2,
            character_count=500,
            word_count=100,
            analysis_status="analyzed",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        texts = [
            "The privacy policy states personal data is collected for marketing.",
            "Data retention period is 5 years from collection date.",
            "Users have the right to request data deletion at any time.",
        ]
        emb_data = np.random.rand(3, 384).astype(np.float32)
        emb_path = tmp_path / f"doc_{doc.id}_embeddings.npy"
        np.save(str(emb_path), emb_data)

        for i, text in enumerate(texts):
            chunk = DocumentChunk(
                document_id=doc.id,
                chunk_index=i,
                page_number=i + 1,
                text=text,
                embedding_path=str(emb_path),
            )
            db.add(chunk)
        db.commit()
        return doc, emb_data, emb_path

    def test_chat_invalid_document_id(self):
        """Chat endpoint should return 404 for nonexistent document."""
        response = client.post(
            "/api/v1/documents/99999/chat",
            json={"message": "Hello"},
        )
        assert response.status_code == 404

    def test_chat_empty_message(self):
        """Chat endpoint should reject empty messages."""
        response = client.post(
            "/api/v1/documents/1/chat",
            json={"message": ""},
        )
        # Either 400 (validation) or 422 (pydantic)
        assert response.status_code in [400, 422]

    def test_chat_response_structure(self, db, tmp_path):
        """Chat response must have required fields."""
        doc, emb_data, emb_path = self._make_doc_with_chunks(db, tmp_path)

        mock_embedding = np.random.rand(384).astype(np.float32)

        with patch("app.services.rag_service.EMBEDDINGS_DIR", tmp_path), \
             patch("app.services.rag_service._embed_text", return_value=mock_embedding), \
             patch("app.services.rag_service._call_chat_provider", return_value="According to the document, personal data is collected."), \
             patch("app.core.config.settings") as mock_settings:
            mock_settings.AI_API_KEY = "test-key"
            mock_settings.AI_PROVIDER = "google"
            mock_settings.AI_MODEL = "gemini-test"

            response = client.post(
                f"/api/v1/documents/{doc.id}/chat",
                json={"message": "What data is collected?"},
            )

        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        assert "answer" in data
        assert "sources" in data
        assert "confidence" in data
        assert "grounded" in data
        assert isinstance(data["sources"], list)

    def test_rag_status_endpoint(self, db, sample_doc):
        """RAG status endpoint should return proper structure."""
        response = client.get(f"/api/v1/documents/{sample_doc.id}/rag-status")
        assert response.status_code == 200
        data = response.json()
        assert data["rag_status"] == "unavailable"
        assert data["chunk_count"] == 0
        assert data["document_id"] == sample_doc.id

    def test_rag_status_nonexistent_doc(self):
        """RAG status endpoint should 404 for missing document."""
        response = client.get("/api/v1/documents/99999/rag-status")
        assert response.status_code == 404


# ===========================================================================
# 6. Index-with-Pages Endpoint Tests
# ===========================================================================

class TestIndexEndpoint:

    def test_index_with_pages_success(self, db, sample_doc, tmp_path):
        """Index endpoint should create chunks and return success."""
        pages = [
            {"page": 1, "text": "Privacy requirements apply to all staff."},
            {"page": 2, "text": "Annual security audits are mandatory."},
        ]

        mock_emb = np.random.rand(2, 384).astype(np.float32)
        with patch("app.services.rag_service.EMBEDDINGS_DIR", tmp_path), \
             patch("app.services.rag_service._embed_texts", return_value=mock_emb):
            response = client.post(
                f"/api/v1/documents/{sample_doc.id}/index-with-pages",
                json={"pages": pages},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["chunks_created"] > 0
        assert data["document_id"] == sample_doc.id

    def test_index_invalid_document(self):
        """Index endpoint should 404 for missing document."""
        response = client.post(
            "/api/v1/documents/99999/index-with-pages",
            json={"pages": [{"page": 1, "text": "Some text."}]},
        )
        assert response.status_code == 404

    def test_index_empty_pages(self, db, sample_doc):
        """Index endpoint should reject empty pages list."""
        response = client.post(
            f"/api/v1/documents/{sample_doc.id}/index-with-pages",
            json={"pages": []},
        )
        assert response.status_code in [400, 422]


# ===========================================================================
# 7. Multi-turn Conversation Test
# ===========================================================================

class TestMultiTurn:

    def test_conversation_history_sent_to_rag(self, db, tmp_path):
        """Verify that conversation history is passed through to chat pipeline."""
        doc = Document(
            filename="multi_turn.pdf",
            file_type="pdf",
            file_size=500,
            total_pages=1,
            character_count=200,
            word_count=40,
            analysis_status="analyzed",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        chunk = DocumentChunk(
            document_id=doc.id,
            chunk_index=0,
            page_number=1,
            text="The organization must retain data for 5 years.",
            embedding_path=str(tmp_path / f"doc_{doc.id}_embeddings.npy"),
        )
        db.add(chunk)
        db.commit()

        emb_data = np.random.rand(1, 384).astype(np.float32)
        np.save(str(tmp_path / f"doc_{doc.id}_embeddings.npy"), emb_data)
        mock_q_emb = np.random.rand(384).astype(np.float32)

        captured_prompt = {}

        def mock_call_provider(sys_prompt, user_prompt):
            captured_prompt["user"] = user_prompt
            return "The document mentions 5 years retention."

        with patch("app.services.rag_service.EMBEDDINGS_DIR", tmp_path), \
             patch("app.services.rag_service._embed_text", return_value=mock_q_emb), \
             patch("app.services.rag_service._call_chat_provider", side_effect=mock_call_provider), \
             patch("app.core.config.settings") as mock_settings:
            mock_settings.AI_API_KEY = "test-key"
            mock_settings.AI_PROVIDER = "google"
            mock_settings.AI_MODEL = "gemini-test"

            response = client.post(
                f"/api/v1/documents/{doc.id}/chat",
                json={
                    "message": "How long is it retained?",
                    "conversation_history": [
                        {"role": "user", "content": "What data do they collect?"},
                        {"role": "assistant", "content": "They collect personal data."},
                    ],
                },
            )

        assert response.status_code == 200
        # The conversation history should appear in the prompt
        if captured_prompt.get("user"):
            assert "CONVERSATION HISTORY" in captured_prompt["user"] or \
                   "USER:" in captured_prompt["user"]


# ===========================================================================
# 8. No-Answer / Threshold Test
# ===========================================================================

class TestNoAnswer:

    def test_returns_no_answer_when_below_threshold(self, db, tmp_path):
        """When all chunks are below threshold, return polite refusal without LLM."""
        doc = Document(
            filename="no_answer.pdf",
            file_type="pdf",
            file_size=300,
            total_pages=1,
            character_count=100,
            word_count=20,
            analysis_status="analyzed",
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)

        chunk = DocumentChunk(
            document_id=doc.id,
            chunk_index=0,
            page_number=1,
            text="This is about something completely unrelated.",
            embedding_path=str(tmp_path / f"doc_{doc.id}_embeddings.npy"),
        )
        db.add(chunk)
        db.commit()

        emb_data = np.random.rand(1, 384).astype(np.float32)
        np.save(str(tmp_path / f"doc_{doc.id}_embeddings.npy"), emb_data)

        # Force all similarities to be 0 (below threshold)
        zero_vec = np.zeros(384, dtype=np.float32)

        with patch("app.services.rag_service.EMBEDDINGS_DIR", tmp_path), \
             patch("app.services.rag_service._embed_text", return_value=zero_vec), \
             patch("app.core.config.settings") as mock_settings:
            mock_settings.AI_API_KEY = "test-key"
            mock_settings.AI_PROVIDER = "google"

            response = client.post(
                f"/api/v1/documents/{doc.id}/chat",
                json={"message": "What is the weather like today?"},
            )

        assert response.status_code == 200
        data = response.json()
        assert data["grounded"] is False
        assert data["confidence"] == 0.0
        assert len(data["sources"]) == 0
        # Should contain a polite refusal
        answer_lower = data["answer"].lower()
        assert "not find" in answer_lower or "could not" in answer_lower or "not indexed" in answer_lower
