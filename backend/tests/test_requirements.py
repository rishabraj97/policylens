"""
PolicyLens — Step 3: AI Requirement Decomposition Tests
Tests cover Pydantic schema validation, AI JSON parsing, edge cases, and
the /api/v1/documents/analyze endpoint — all using a mocked AI provider.

IMPORTANT: These tests do NOT call real paid AI APIs.
The AI provider is fully mocked via unittest.mock.
"""
from __future__ import annotations

import json
from typing import Any, Dict
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.requirements import (
    AnalyzeRequest,
    DocumentAnalysisResponse,
    RequirementItem,
)
from app.services.ai_service import (
    _extract_json_from_response,
    _merge_requirements,
    _validate_ai_output,
    chunk_document,
)

client = TestClient(app)

# ---------------------------------------------------------------------------
# Mock AI response data
# ---------------------------------------------------------------------------

MOCK_AI_JSON: Dict[str, Any] = {
    "document_summary": "Test privacy policy describing data processing obligations.",
    "requirements": [
        {
            "requirement": "Maintain an updated privacy notice.",
            "action": "Review and update the organisation's privacy notice.",
            "applicability": "Organisations processing personal data.",
            "deadline": "Not specified",
            "responsible_department": "Legal",
            "evidence_required": "Current approved privacy notice.",
            "status": "Pending",
            "source_pages": [1],
            "confidence": 0.91,
        },
        {
            "requirement": "Conduct an annual security audit.",
            "action": "Schedule and complete annual security audit.",
            "applicability": "IT security team.",
            "deadline": "October 15th annually",
            "responsible_department": "IT Security",
            "evidence_required": "Signed audit report.",
            "status": "Needs Review",
            "source_pages": [2],
            "confidence": 0.78,
        },
    ],
}


# ---------------------------------------------------------------------------
# Helper: mock AI call
# ---------------------------------------------------------------------------

def _make_mock_ai(json_data: Dict[str, Any] = None):
    """Returns a mock that returns the given JSON dict as a string."""
    data = json_data or MOCK_AI_JSON
    mock = MagicMock(return_value=json.dumps(data))
    return mock


# ---------------------------------------------------------------------------
# 1. Schema validation — valid RequirementItem
# ---------------------------------------------------------------------------

class TestRequirementItemSchema:
    def test_valid_requirement(self):
        item = RequirementItem(
            requirement="Maintain privacy notice.",
            action="Review and update privacy notice.",
            applicability="Organisations processing personal data.",
            deadline="Not specified",
            responsible_department="Legal",
            evidence_required="Approved privacy notice.",
            status="Pending",
            source_pages=[1],
            confidence=0.91,
        )
        assert item.requirement == "Maintain privacy notice."
        assert item.status == "Pending"
        assert item.confidence == 0.91
        assert item.source_pages == [1]

    def test_valid_statuses(self):
        for s in ("Pending", "Needs Review", "Completed"):
            item = RequirementItem(
                requirement="r",
                action="a",
                applicability="all",
                status=s,
                source_pages=[1],
                confidence=0.5,
            )
            assert item.status == s

    def test_invalid_status_coerced_to_needs_review(self):
        item = RequirementItem(
            requirement="r",
            action="a",
            applicability="all",
            status="Unknown Status",
            source_pages=[1],
            confidence=0.5,
        )
        assert item.status == "Needs Review"

    def test_confidence_bounds(self):
        """Confidence must be 0.0–1.0; Pydantic enforces this via ge/le."""
        with pytest.raises(Exception):
            RequirementItem(
                requirement="r",
                action="a",
                applicability="all",
                status="Pending",
                source_pages=[1],
                confidence=1.5,  # invalid
            )

    def test_confidence_lower_bound(self):
        with pytest.raises(Exception):
            RequirementItem(
                requirement="r",
                action="a",
                applicability="all",
                status="Pending",
                source_pages=[1],
                confidence=-0.1,  # invalid
            )

    def test_source_pages_deduplication(self):
        item = RequirementItem(
            requirement="r",
            action="a",
            applicability="all",
            status="Pending",
            source_pages=[3, 1, 2, 1, 3],
            confidence=0.5,
        )
        assert item.source_pages == [1, 2, 3]

    def test_source_pages_must_be_positive(self):
        with pytest.raises(Exception):
            RequirementItem(
                requirement="r",
                action="a",
                applicability="all",
                status="Pending",
                source_pages=[0],  # page 0 is invalid
                confidence=0.5,
            )

    def test_source_pages_cannot_be_empty(self):
        with pytest.raises(Exception):
            RequirementItem(
                requirement="r",
                action="a",
                applicability="all",
                status="Pending",
                source_pages=[],
                confidence=0.5,
            )

    def test_missing_deadline_normalised(self):
        item = RequirementItem(
            requirement="r",
            action="a",
            applicability="all",
            status="Pending",
            source_pages=[1],
            confidence=0.5,
            deadline=None,
        )
        assert item.deadline == "Not specified"

    def test_missing_department_normalised(self):
        item = RequirementItem(
            requirement="r",
            action="a",
            applicability="all",
            status="Pending",
            source_pages=[1],
            confidence=0.5,
            responsible_department=None,
        )
        assert item.responsible_department == "Not specified"

    def test_missing_evidence_normalised(self):
        item = RequirementItem(
            requirement="r",
            action="a",
            applicability="all",
            status="Pending",
            source_pages=[1],
            confidence=0.5,
            evidence_required=None,
        )
        assert item.evidence_required == "Not specified"


# ---------------------------------------------------------------------------
# 2. DocumentAnalysisResponse schema
# ---------------------------------------------------------------------------

class TestDocumentAnalysisResponse:
    def test_valid_response(self):
        resp = DocumentAnalysisResponse(
            success=True,
            document_summary="Test summary.",
            requirements=[
                RequirementItem(
                    requirement="r",
                    action="a",
                    applicability="all",
                    status="Pending",
                    source_pages=[1],
                    confidence=0.8,
                )
            ],
        )
        assert resp.success is True
        assert len(resp.requirements) == 1

    def test_empty_requirements_list(self):
        resp = DocumentAnalysisResponse(
            success=True,
            document_summary="No actionable requirements found.",
            requirements=[],
        )
        assert resp.requirements == []


# ---------------------------------------------------------------------------
# 3. AI JSON parsing helpers
# ---------------------------------------------------------------------------

class TestExtractJsonFromResponse:
    def test_clean_json(self):
        raw = json.dumps(MOCK_AI_JSON)
        result = _extract_json_from_response(raw)
        assert result["document_summary"] == MOCK_AI_JSON["document_summary"]

    def test_json_with_markdown_fences(self):
        raw = f"```json\n{json.dumps(MOCK_AI_JSON)}\n```"
        result = _extract_json_from_response(raw)
        assert "requirements" in result

    def test_json_with_plain_fences(self):
        raw = f"```\n{json.dumps(MOCK_AI_JSON)}\n```"
        result = _extract_json_from_response(raw)
        assert "requirements" in result

    def test_invalid_json_raises(self):
        import pytest
        with pytest.raises(Exception):
            _extract_json_from_response("This is not JSON at all {broken}")


# ---------------------------------------------------------------------------
# 4. Validate AI output
# ---------------------------------------------------------------------------

class TestValidateAiOutput:
    def test_valid_output(self):
        result = _validate_ai_output(MOCK_AI_JSON)
        assert isinstance(result, DocumentAnalysisResponse)
        assert len(result.requirements) == 2

    def test_missing_summary_uses_fallback(self):
        data = dict(MOCK_AI_JSON)
        data["document_summary"] = ""
        result = _validate_ai_output(data)
        assert result.document_summary  # not empty

    def test_invalid_confidence_clamped(self):
        data = {
            "document_summary": "test",
            "requirements": [
                {
                    "requirement": "r",
                    "action": "a",
                    "applicability": "all",
                    "deadline": "Not specified",
                    "responsible_department": "Not specified",
                    "evidence_required": "Not specified",
                    "status": "Pending",
                    "source_pages": [1],
                    "confidence": 2.5,  # above 1.0 — should be clamped
                }
            ],
        }
        result = _validate_ai_output(data)
        assert result.requirements[0].confidence == 1.0

    def test_invalid_status_coerced(self):
        data = {
            "document_summary": "test",
            "requirements": [
                {
                    "requirement": "r",
                    "action": "a",
                    "applicability": "all",
                    "deadline": "Not specified",
                    "responsible_department": "Not specified",
                    "evidence_required": "Not specified",
                    "status": "INVALID_STATUS",
                    "source_pages": [1],
                    "confidence": 0.5,
                }
            ],
        }
        result = _validate_ai_output(data)
        assert result.requirements[0].status == "Needs Review"

    def test_requirement_with_no_source_pages_skipped(self):
        data = {
            "document_summary": "test",
            "requirements": [
                {
                    "requirement": "r",
                    "action": "a",
                    "applicability": "all",
                    "status": "Pending",
                    "source_pages": [],  # empty — should be skipped
                    "confidence": 0.5,
                }
            ],
        }
        result = _validate_ai_output(data)
        assert len(result.requirements) == 0


# ---------------------------------------------------------------------------
# 5. Document chunking
# ---------------------------------------------------------------------------

class TestChunkDocument:
    def _make_pages(self, count: int, chars_each: int = 100):
        return [
            {"page": i + 1, "text": "x" * chars_each}
            for i in range(count)
        ]

    def test_single_chunk_small_document(self):
        pages = self._make_pages(3, chars_each=100)
        chunks = chunk_document(pages, max_chars=10000)
        assert len(chunks) == 1
        assert chunks[0]["pages"] == [1, 2, 3]

    def test_multiple_chunks_large_document(self):
        pages = self._make_pages(4, chars_each=600)
        chunks = chunk_document(pages, max_chars=1000)
        assert len(chunks) > 1

    def test_empty_pages_skipped(self):
        pages = [
            {"page": 1, "text": "real content here"},
            {"page": 2, "text": ""},
            {"page": 3, "text": "   "},
            {"page": 4, "text": "more content"},
        ]
        chunks = chunk_document(pages, max_chars=10000)
        assert len(chunks) == 1
        assert set(chunks[0]["pages"]) == {1, 4}

    def test_page_numbers_preserved(self):
        pages = [{"page": 5, "text": "content"}]
        chunks = chunk_document(pages, max_chars=10000)
        assert chunks[0]["pages"] == [5]


# ---------------------------------------------------------------------------
# 6. Requirement merging
# ---------------------------------------------------------------------------

class TestMergeRequirements:
    def _req(self, text: str, pages: list, confidence: float):
        return RequirementItem(
            requirement=text,
            action="action",
            applicability="all",
            status="Pending",
            source_pages=pages,
            confidence=confidence,
        )

    def test_identical_requirements_merged(self):
        reqs = [
            self._req("Maintain privacy notice.", [1], 0.8),
            self._req("Maintain privacy notice.", [2], 0.9),
        ]
        merged = _merge_requirements(reqs)
        assert len(merged) == 1
        assert set(merged[0].source_pages) == {1, 2}
        assert merged[0].confidence == pytest.approx(0.85, abs=0.01)

    def test_distinct_requirements_not_merged(self):
        reqs = [
            self._req("Maintain privacy notice.", [1], 0.8),
            self._req("Conduct annual security audit.", [2], 0.9),
        ]
        merged = _merge_requirements(reqs)
        assert len(merged) == 2

    def test_case_insensitive_merge(self):
        reqs = [
            self._req("Maintain privacy notice.", [1], 0.8),
            self._req("MAINTAIN PRIVACY NOTICE.", [2], 0.9),
        ]
        merged = _merge_requirements(reqs)
        assert len(merged) == 1


# ---------------------------------------------------------------------------
# 7. API endpoint tests (mocked AI)
# ---------------------------------------------------------------------------

SAMPLE_PAGES = [
    {"page": 1, "text": "Organizations processing personal data must maintain an updated privacy notice."},
    {"page": 2, "text": "Annual security audits must be completed before October 15th."},
]


class TestAnalyzeEndpoint:
    """Tests for POST /api/v1/documents/analyze with mocked AI."""

    _SENTINEL = object()

    def _post_analyze(self, pages=_SENTINEL, filename="test.pdf"):
        actual_pages = SAMPLE_PAGES if pages is self._SENTINEL else pages
        return client.post(
            "/api/v1/documents/analyze",
            json={"pages": actual_pages, "filename": filename},
        )

    @patch("app.api.routes.documents.analyze_document")
    def test_successful_analysis(self, mock_analyze):
        """Endpoint returns structured requirements when AI succeeds."""
        mock_analyze.return_value = DocumentAnalysisResponse(
            success=True,
            document_summary="Test privacy policy.",
            requirements=[
                RequirementItem(
                    requirement="Maintain an updated privacy notice.",
                    action="Review and update the privacy notice.",
                    applicability="Organisations processing personal data.",
                    deadline="Not specified",
                    responsible_department="Legal",
                    evidence_required="Approved privacy notice.",
                    status="Pending",
                    source_pages=[1],
                    confidence=0.91,
                )
            ],
        )

        response = self._post_analyze()
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert len(data["requirements"]) == 1
        assert data["requirements"][0]["status"] == "Pending"
        assert data["requirements"][0]["source_pages"] == [1]
        assert data["requirements"][0]["confidence"] == pytest.approx(0.91, abs=0.01)

    def test_empty_pages_returns_400(self):
        """Endpoint rejects requests with no pages (Pydantic returns 422 for min_length violation)."""
        response = self._post_analyze(pages=[])
        # Pydantic min_length=1 constraint → 422 Unprocessable Entity
        assert response.status_code in (400, 422)

    @patch("app.api.routes.documents.analyze_document")
    def test_no_requirements_extracted(self, mock_analyze):
        """Endpoint handles documents with zero requirements gracefully."""
        mock_analyze.return_value = DocumentAnalysisResponse(
            success=True,
            document_summary="No actionable requirements identified.",
            requirements=[],
        )

        response = self._post_analyze()
        assert response.status_code == 200
        data = response.json()
        assert data["requirements"] == []

    @patch("app.api.routes.documents.analyze_document")
    def test_multiple_requirements(self, mock_analyze):
        """All requirements from mock are returned."""
        reqs = [
            RequirementItem(
                requirement=f"Requirement {i}",
                action=f"Action {i}",
                applicability="all",
                status="Needs Review",
                source_pages=[i],
                confidence=0.7,
            )
            for i in range(1, 6)
        ]
        mock_analyze.return_value = DocumentAnalysisResponse(
            success=True,
            document_summary="Multi-requirement document.",
            requirements=reqs,
        )

        response = self._post_analyze()
        assert response.status_code == 200
        assert len(response.json()["requirements"]) == 5

    @patch("app.api.routes.documents.analyze_document")
    def test_source_pages_in_response(self, mock_analyze):
        """Source pages are preserved correctly in the API response."""
        mock_analyze.return_value = DocumentAnalysisResponse(
            success=True,
            document_summary="Multi-page doc.",
            requirements=[
                RequirementItem(
                    requirement="Cross-page requirement.",
                    action="Action.",
                    applicability="all",
                    status="Needs Review",
                    source_pages=[3, 4, 5],
                    confidence=0.65,
                )
            ],
        )

        response = self._post_analyze()
        assert response.status_code == 200
        data = response.json()
        assert data["requirements"][0]["source_pages"] == [3, 4, 5]

    @patch("app.api.routes.documents.analyze_document")
    def test_ai_service_unavailable_returns_503(self, mock_analyze):
        """AI service errors are returned as proper HTTP errors."""
        from fastapi import HTTPException

        mock_analyze.side_effect = HTTPException(
            status_code=503,
            detail="AI service is not configured. Set the AI_API_KEY environment variable.",
        )

        response = self._post_analyze()
        assert response.status_code == 503
        assert "AI" in response.json()["detail"] or "service" in response.json()["detail"].lower()

    @patch("app.api.routes.documents.analyze_document")
    def test_confidence_values_in_range(self, mock_analyze):
        """All returned confidence values are between 0.0 and 1.0."""
        mock_analyze.return_value = DocumentAnalysisResponse(
            success=True,
            document_summary="Confidence test.",
            requirements=[
                RequirementItem(
                    requirement="r",
                    action="a",
                    applicability="all",
                    status="Pending",
                    source_pages=[1],
                    confidence=c,
                )
                for c in [0.0, 0.5, 1.0, 0.78, 0.33]
            ],
        )

        response = self._post_analyze()
        assert response.status_code == 200
        for req in response.json()["requirements"]:
            assert 0.0 <= req["confidence"] <= 1.0

    @patch("app.api.routes.documents.analyze_document")
    def test_document_summary_present(self, mock_analyze):
        """document_summary is always present in successful responses."""
        mock_analyze.return_value = DocumentAnalysisResponse(
            success=True,
            document_summary="This is the summary.",
            requirements=[],
        )

        response = self._post_analyze()
        assert response.status_code == 200
        assert "document_summary" in response.json()
        assert response.json()["document_summary"] == "This is the summary."
