# PolicyLens

> "Turn complicated policies into simple, actionable compliance work."

PolicyLens is an AI-powered compliance platform designed to help businesses and organizations navigate lengthy government regulations, privacy standards, financial rules, notifications, and contracts. It transforms intricate legal text into organized, actionable requirements with deadlines, assigned departments, and required evidence.

---

## Overview

In Step 1 (Project Initialization & Clean Architecture Scaffolding), PolicyLens establishes a lightweight, scalable, and decoupled foundation:
- **Frontend**: Responsive React (Vite) single-page application styled with Tailwind CSS and Lucide React icons.
- **Backend**: High-performance FastAPI service with modular routing, CORS middleware, and an extensible SQLite/SQLAlchemy database setup ready for future PostgreSQL migration.
- **Core Workflow Preview**: Landing Page &rarr; Upload Interface (PDF/TXT) &rarr; Simulated AI Analysis &rarr; Static Compliance Dashboard.

---

## Tech Stack

### Frontend
- **Framework**: [React 19](https://react.dev/) with [Vite](https://vitejs.dev/)
- **Language**: JavaScript (ES Modules)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Routing**: [React Router](https://reactrouter.com/) (v7/v6)
- **Icons**: [Lucide React](https://lucide.dev/)
- **HTTP Client**: Centralized Fetch API client (`src/services/api.js`)

### Backend
- **Framework**: [FastAPI](https://fastapi.tiangolo.com/)
- **Server**: [Uvicorn](https://www.uvicorn.org/)
- **Database**: SQLite via [SQLAlchemy](https://www.sqlalchemy.org/) (ready for PostgreSQL)
- **Configuration**: `pydantic-settings` & Python standard library

---

## Project Structure

```text
policylens/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Reusable UI elements (Button, Badge, LoadingSpinner)
│   │   │   ├── layout/         # Navigation, Sidebar, PageContainer
│   │   │   └── ui/             # Card, StatCard, Table components
│   │   ├── pages/
│   │   │   ├── LandingPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── UploadPage.jsx
│   │   │   └── AnalysisPage.jsx
│   │   ├── services/
│   │   │   └── api.js          # Centralized API service
│   │   ├── hooks/              # Custom React hooks
│   │   ├── utils/              # Helper utilities
│   │   ├── App.jsx             # Route definitions & layout wrapper
│   │   ├── main.jsx            # Entry point
│   │   └── index.css           # Tailwind CSS directives & theme rules
│   ├── public/
│   ├── package.json
│   ├── vite.config.js
│   └── .env.example
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes/         # Versioned route handlers (health, etc.)
│   │   ├── core/               # App configuration & DB session engine
│   │   ├── models/             # SQLAlchemy ORM models (extensible)
│   │   ├── schemas/            # Pydantic validation schemas
│   │   ├── services/           # Business logic & services
│   │   └── main.py             # FastAPI application entrypoint & CORS
│   ├── tests/                  # Unit and integration test suites
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
│
├── uploads/                    # Local storage for uploaded files
├── .gitignore
├── README.md
└── .env.example
```

---

## Running Locally

### 1. Backend Setup

Open a terminal and navigate to the `backend/` directory:

```bash
cd backend
```

Create and activate a virtual environment:

**Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

**Linux / macOS:**
```bash
python3 -m venv venv
source venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

Launch the FastAPI development server:
```bash
uvicorn app.main:app --reload
```

The backend will be live at:
- **API Base**: [http://localhost:8000](http://localhost:8000)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)
- **Interactive Swagger Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc Documentation**: [http://localhost:8000/redoc](http://localhost:8000/redoc)

---

### 2. Frontend Setup

Open a second terminal and navigate to the `frontend/` directory:

```bash
cd frontend
npm install
npm run dev
```

The application will be live at:
- **Frontend App**: [http://localhost:5173](http://localhost:5173)

---

## Application Walkthrough

1. **Landing Page (`/`)**: Modern B2B overview of PolicyLens with clear call-to-actions.
2. **Upload Interface (`/upload`)**: Drag-and-drop or browse policy documents (.pdf, .txt) with file size/type validation.
3. **Simulation Analysis (`/analysis`)**: Visual step-by-step progress indicator simulating document parsing, requirement extraction, team mapping, and action creation.
4. **Compliance Dashboard (`/dashboard`)**: Key compliance metrics (Total, Pending, Completed, Needs Review), progress overview, and an actionable requirement table.

---

## Future Roadmap

- **STEP 2**: Real PDF/TXT document upload & text extraction pipeline
- **STEP 3**: AI requirement extraction (LLM integration)
- **STEP 4**: Database persistence (PostgreSQL migration & schema)
- **STEP 5**: Real-time compliance dashboard with dynamic metrics
- **STEP 6**: RAG-based Policy Q&A engine
- **STEP 7**: Semantic search & citation references
- **STEP 8**: Policy version comparison
- **STEP 9**: Automated deadline reminders & alerts
- **STEP 10**: Advanced compliance intelligence & knowledge graphs
