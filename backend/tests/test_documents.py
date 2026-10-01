import io
from pathlib import Path
from fastapi.testclient import TestClient
from app.main import app
from app.services.document_service import normalize_text

client = TestClient(app)
FIXTURES_DIR = Path(__file__).parent / "fixtures"


def test_upload_valid_txt():
    txt_path = FIXTURES_DIR / "sample.txt"
    assert txt_path.exists(), "sample.txt fixture must exist"

    with open(txt_path, "rb") as f:
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("sample.txt", f, "text/plain")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["document"]["filename"] == "sample.txt"
    assert data["document"]["file_type"] == "txt"
    assert data["document"]["total_pages"] == 1
    assert data["document"]["character_count"] > 50
    assert data["document"]["word_count"] > 10
    assert len(data["content"]) == 1
    assert data["content"][0]["page"] == 1
    assert "privacy notice" in data["content"][0]["text"].lower()


def test_upload_valid_pdf():
    pdf_path = FIXTURES_DIR / "sample.pdf"
    assert pdf_path.exists(), "sample.pdf fixture must exist"

    with open(pdf_path, "rb") as f:
        response = client.post(
            "/api/v1/documents/upload",
            files={"file": ("sample.pdf", f, "application/pdf")},
        )

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert data["document"]["filename"] == "sample.pdf"
    assert data["document"]["file_type"] == "pdf"
    assert data["document"]["total_pages"] == 2
    assert len(data["content"]) == 2
    assert data["content"][0]["page"] == 1
    assert "page 1" in data["content"][0]["text"].lower()
    assert data["content"][1]["page"] == 2
    assert "page 2" in data["content"][1]["text"].lower()


def test_upload_unsupported_extension():
    fake_file = io.BytesIO(b"binary executable payload")
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("malicious.exe", fake_file, "application/x-msdownload")},
    )
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


def test_upload_empty_file():
    empty_file = io.BytesIO(b"")
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("empty.txt", empty_file, "text/plain")},
    )
    assert response.status_code == 400
    assert "empty" in response.json()["detail"].lower()


def test_upload_corrupted_pdf():
    # File named .pdf but doesn't have valid %PDF- header
    bad_pdf = io.BytesIO(b"Not a real PDF header")
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("corrupted.pdf", bad_pdf, "application/pdf")},
    )
    assert response.status_code == 400
    assert "invalid pdf" in response.json()["detail"].lower()


def test_upload_oversized_file():
    # 26 MB file (exceeds 25 MB limit)
    large_payload = b"A" * (26 * 1024 * 1024)
    large_file = io.BytesIO(large_payload)
    response = client.post(
        "/api/v1/documents/upload",
        files={"file": ("huge.txt", large_file, "text/plain")},
    )
    assert response.status_code == 400
    assert "exceeds" in response.json()["detail"].lower()


def test_text_normalization():
    raw_input = "  Clause 1. Overview   \r\n\r\n\r\n\r\nSubclause A   \n\n\n   End of text   "
    normalized = normalize_text(raw_input)
    # Consecutive blank lines should be collapsed to \n\n
    assert "\r" not in normalized
    assert "\n\n\n" not in normalized
    assert "Clause 1. Overview" in normalized
    assert "Subclause A" in normalized
    assert normalized.startswith("Clause 1. Overview")
    assert normalized.endswith("End of text")
