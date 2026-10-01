# PolicyLens - Backend Service

High-performance, lightweight FastAPI backend for PolicyLens.

## Features
- **FastAPI**: Fast, asynchronous, auto-documenting REST API.
- **Pydantic v2**: Strict request and response data validation.
- **SQLAlchemy 2.0**: Database ORM with SQLite for MVP and seamless PostgreSQL migration path.
- **CORS Configured**: Pre-configured for local frontend Vite dev server (`http://localhost:5173`).
- **Interactive Documentation**: Available at `/docs` (Swagger UI) and `/redoc` (ReDoc).

---

## Directory Structure

```text
backend/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── documents.py     # POST /api/v1/documents/upload
│   │   │   └── health.py        # /api/v1/health route
│   │   └── __init__.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── config.py            # Settings loaded from environment
│   │   └── database.py          # SQLAlchemy engine and session factory
│   ├── models/
│   │   ├── __init__.py
│   │   └── compliance.py        # Requirement database model (Step 4)
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── compliance.py        # Pydantic schemas (Health, Root)
│   │   └── documents.py         # Document upload schemas (Page, Metadata, Response)
│   ├── services/
│   │   ├── __init__.py
│   │   └── document_service.py  # PyMuPDF/TXT ingestion & text normalization
│   ├── __init__.py
│   └── main.py                  # App entry point, CORS, root endpoints
├── tests/
│   ├── fixtures/
│   │   ├── sample.pdf           # Synthetic PDF test fixture
│   │   └── sample.txt           # Synthetic TXT test fixture
│   ├── __init__.py
│   ├── test_documents.py        # Document ingestion and normalization tests
│   └── test_health.py           # Unit tests
├── requirements.txt
├── .env.example
└── README.md
```

---

## Quickstart

### 1. Create and Activate Virtual Environment
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 2. Install Dependencies
```powershell
pip install -r requirements.txt
```

### 3. Run Development Server
```powershell
uvicorn app.main:app --reload
```

The service will start on `http://127.0.0.1:8000`.

---

## Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/` | Root verification endpoint |
| `GET` | `/health` | Health check probe |
| `GET` | `/api/v1/health` | Version 1 health check probe |
| `POST` | `/api/v1/documents/upload` | Ingest PDF/TXT document, extract text page-by-page |
| `GET` | `/docs` | Interactive OpenAPI Swagger documentation |
| `GET` | `/redoc` | OpenAPI ReDoc documentation |

---

## Testing

Run unit tests using pytest:

```powershell
pytest
```
