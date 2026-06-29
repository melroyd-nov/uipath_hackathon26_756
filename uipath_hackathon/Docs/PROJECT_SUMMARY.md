# Call Center Analytics Platform — Full Project Summary

> Reference documentation for the Acme Call Center Analytics platform.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture Overview](#2-architecture-overview)
3. [Folder Structure](#3-folder-structure)
4. [Tech Stack](#4-tech-stack)
5. [Database Layer](#5-database-layer)
6. [Backend — FastAPI](#6-backend--fastapi)
   - [Entry Point & Startup](#61-entry-point--startup)
   - [Configuration](#62-configuration)
   - [Database Session Management](#63-database-session-management)
   - [ORM Models](#64-orm-models)
   - [Routers](#65-routers)
   - [Services](#66-services)
   - [Schemas](#67-schemas)
   - [Data Seeding & Loading Scripts](#68-data-seeding--loading-scripts)
7. [Frontend — React / Vite](#7-frontend--react--vite)
   - [Entry Point & Routing](#71-entry-point--routing)
   - [Pages](#72-pages)
   - [Components](#73-components)
   - [API Client Layer](#74-api-client-layer)
   - [State Management & Context](#75-state-management--context)
   - [Utilities & Hooks](#76-utilities--hooks)
8. [AI Integration — Gemini](#8-ai-integration--gemini)
9. [Follow-up Workflow State Machine](#9-follow-up-workflow-state-machine)
10. [KPI Benchmarks](#10-kpi-benchmarks)
11. [Deployment & Infrastructure](#11-deployment--infrastructure)
12. [Dependencies](#12-dependencies)
13. [Key Data Flows](#13-key-data-flows)

---

## 1. Project Overview

This is a **call center analytics platform** built for an insurance company's contact centre operations. It ingests transcript `.txt` files from call recordings, runs AI-powered analysis (via Gemini 2.5 Flash) to extract structured signals from each call, stores all results in a PostgreSQL database, and surfaces everything through a React dashboard with 15+ analytics pages.

Key capabilities:
- **Automated transcript ingestion** — parse raw `.txt` transcript files into structured database rows
- **AI-powered call analysis** — Gemini extracts sentiment, call intent (up to 3), trigger words, compliance status, resolution outcome, follow-up action items, and a plain-English call summary
- **Real-time KPI dashboard** — 8 headline KPIs with benchmark comparisons, trend charts, and agent scorecards
- **Follow-up lifecycle management** — supervisor approval workflow for AI-generated action items with a full status state machine (pending → approved/rejected → in_progress → completed)
- **AI Insights chat** — natural language Q&A over live database aggregates, powered by Gemini with a structured analytics context injected into the prompt
- **Analytics drill-downs** — dedicated pages for sentiment, escalations, compliance, resolution, intents, trigger words, and friction points

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                  Browser / React SPA                     │
│   Vite + React 19 + TypeScript + TanStack Query          │
│   Recharts + Tailwind CSS                                │
│   Served by: Nginx (Docker) or Vite dev server           │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP / REST  (axios)
                     ▼
┌─────────────────────────────────────────────────────────┐
│              FastAPI Backend (Python 3.13)               │
│   6 routers: calls, dashboard, agents, analytics,        │
│              ai, followups                               │
│   SQLAlchemy ORM   │   Pydantic v2 schemas               │
│   Uvicorn ASGI server                                    │
└──────────┬──────────────────────────┬───────────────────┘
           │ psycopg2 / SQLAlchemy    │ google-generativeai SDK
           ▼                          ▼
┌──────────────────────┐   ┌─────────────────────────────┐
│   PostgreSQL DB       │   │   Gemini 2.5 Flash (Google) │
│   GCP Cloud SQL       │   │   API key from .env          │
│   3 tables:           │   │   Used for: transcript       │
│   call_records        │   │   analysis + Q&A chat        │
│   call_followups      │   └─────────────────────────────┘
│   ai_usage            │
└──────────────────────┘
```

The frontend is a **single-page application** that communicates with the backend exclusively via REST API calls. Both are containerised with Docker and deployed to **Google Cloud Run** (with Cloud SQL for the database). Locally, the backend runs via Uvicorn and the frontend via Vite's dev server.

---

## 3. Folder Structure

```
C:\Development\Callcenter\
│
├── backend\                        # FastAPI application
│   ├── main.py                     # App factory, middleware, router registration, startup hooks
│   ├── config.py                   # DB URL, CORS origins, KPI benchmarks
│   ├── database.py                 # SQLAlchemy engine, SessionLocal, get_db() dependency
│   ├── models.py                   # ORM table definitions (CallRecord, CallFollowup, AiUsage)
│   ├── requirements.txt            # Python dependencies
│   ├── .env                        # Secrets: GEMINI_API_KEY, GEMINI_MODEL, DB_URL (not in git)
│   ├── Dockerfile                  # Production container (python:3.13-slim)
│   ├── .dockerignore
│   ├── .gcloudignore
│   ├── start_local.bat / .ps1      # Scripts to run Uvicorn locally
│   ├── uvicorn.log                 # Runtime log output (local dev)
│   │
│   ├── routers\                    # One file per API domain
│   │   ├── __init__.py
│   │   ├── calls.py                # GET /api/calls, /api/calls/{id}
│   │   ├── dashboard.py            # GET /api/dashboard/summary
│   │   ├── agents.py               # GET /api/agents, /api/agents/{name}
│   │   ├── analytics.py            # GET /api/analytics/* (20+ endpoints)
│   │   ├── ai.py                   # POST /api/ai/ask, GET /api/ai/suggested-questions, /api/ai/usage
│   │   └── followups.py            # CRUD for call follow-ups (nested + global routes)
│   │
│   ├── schemas\                    # Pydantic request/response models
│   │   ├── __init__.py
│   │   ├── call_schemas.py
│   │   ├── dashboard_schemas.py
│   │   ├── agent_schemas.py
│   │   ├── followup_schemas.py
│   │   └── ai_schemas.py
│   │
│   └── services\                   # Business logic, DB queries, AI calls
│       ├── __init__.py
│       ├── ai_service.py           # Gemini model init, _build_context(), ask(), _log_ai_call()
│       └── analytics_service.py    # All SQL aggregation functions for analytics endpoints
│
├── frontend\                       # React SPA (Vite + TypeScript)
│   ├── index.html                  # HTML shell
│   ├── vite.config.ts              # Vite config, proxy: /api → localhost:8000
│   ├── tsconfig*.json              # TypeScript configs (app, node, root)
│   ├── tailwind.config.js          # Tailwind CSS config
│   ├── postcss.config.js
│   ├── eslint.config.js
│   ├── package.json                # npm dependencies
│   ├── Dockerfile                  # Production container (nginx)
│   ├── nginx.conf.template         # Nginx config with SPA fallback + /api proxy
│   ├── .dockerignore / .gcloudignore / .gitignore
│   │
│   └── src\
│       ├── main.tsx                # React root — wraps with QueryClientProvider, Router, ThemeContext
│       ├── App.tsx                 # Route definitions (15 pages)
│       ├── App.css / index.css     # Global styles, Tailwind directives
│       │
│       ├── api\                    # Axios API call functions (one file per domain)
│       │   ├── client.ts           # Axios instance with baseURL = /api
│       │   ├── calls.ts
│       │   ├── dashboard.ts
│       │   ├── agents.ts
│       │   ├── analytics.ts
│       │   ├── ai.ts
│       │   └── followups.ts
│       │
│       ├── pages\                  # Top-level route components (15 pages)
│       │   ├── DashboardPage.tsx
│       │   ├── CallLogPage.tsx
│       │   ├── CallDetailPage.tsx
│       │   ├── AgentsPage.tsx
│       │   ├── AgentDetailPage.tsx
│       │   ├── SentimentPage.tsx
│       │   ├── EscalationsPage.tsx
│       │   ├── CompliancePage.tsx
│       │   ├── ResolutionPage.tsx
│       │   ├── IntentsPage.tsx
│       │   ├── TriggerWordsPage.tsx
│       │   ├── FrictionPage.tsx
│       │   ├── FollowupsPage.tsx
│       │   ├── FollowupsOverviewPage.tsx
│       │   ├── AIInsightsPage.tsx
│       │   ├── LiveCallPage.tsx
│       │   ├── MarketingPage.tsx
│       │   └── LoginPage.tsx
│       │
│       ├── components\             # Reusable UI components
│       │   ├── ai\                 # Chat UI: AiCopilot, AiChatMessage, TypewriterText, etc.
│       │   ├── call\               # Call detail panels: TranscriptAnalysis, AiAgentPanel
│       │   ├── cards\              # KpiCard, AgentProfileCard
│       │   ├── charts\             # 18 chart components (Recharts-based)
│       │   ├── dashboard\          # Dashboard widgets: HealthGauge, KpiHeroCard, FollowupStatusWidget, etc.
│       │   ├── layout\             # MainLayout, Sidebar, TopBar, AiUsageBadge
│       │   └── shared\             # Generic: GlassPanel, FilterBar, LoadingSpinner, Skeleton, etc.
│       │
│       ├── context\
│       │   ├── FilterContext.tsx   # Global date range + agent filter state
│       │   └── ThemeContext.tsx    # Light/dark theme toggle
│       │
│       ├── hooks\
│       │   ├── useDateRange.ts     # Date range derived from FilterContext
│       │   └── useIsLightTheme.ts  # Theme-aware boolean
│       │
│       ├── types\
│       │   └── index.ts            # All shared TypeScript interfaces
│       │
│       └── utils\
│           ├── benchmarks.ts       # KPI benchmark thresholds (mirrors config.py)
│           ├── colors.ts           # Colour constants for charts
│           ├── csvExport.ts        # CSV download utility
│           └── formatters.ts       # Date, number, percentage formatters
│
├── uipath\                         # UiPath BPMN artefacts
│   ├── call-center-transcript-process.bpmn   # BPMN 2.0 process diagram (UiPath Maestro compatible)
│   └── PROJECT_SUMMARY.md          # This file
│
├── load_transcripts.py             # Standalone script: parse .txt files → PostgreSQL (direct psycopg2)
├── generate_summaries.py           # Standalone script: AI summary generation
├── DASHBOARD_PLAN.md               # Early planning notes
├── PROJECT_DOCUMENTATION.md        # Alternate documentation file
├── architecture-diagram.svg        # SVG architecture diagram
├── transcripts.zip                 # Sample transcript files (zipped)
│
└── *.txt                           # Raw transcript samples (Cancellations, Claims, Grievances, etc.)
```

---

## 4. Tech Stack

### Backend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Language | Python | 3.13 | Primary backend language |
| Framework | FastAPI | 0.115.0 | REST API framework with auto OpenAPI docs |
| ASGI Server | Uvicorn | 0.30.6 | Production-grade ASGI server |
| ORM | SQLAlchemy | 2.0.36 | Database access and schema management |
| DB Driver | psycopg2-binary | 2.9.9 | PostgreSQL adapter |
| Validation | Pydantic | 2.9.2 | Request/response schema validation |
| HTTP Client | httpx | 0.27.2 | Async HTTP (available, not heavily used currently) |
| AI | google-generativeai | ≥0.8.0 | Gemini 2.5 Flash API client |
| Env | python-dotenv | 1.0.1 | `.env` file loading |

### Frontend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| Language | TypeScript | ~5.9.3 | Type-safe JavaScript |
| UI Framework | React | 19.2.4 | Component-based UI |
| Build Tool | Vite | 8.0.1 | Dev server + bundler |
| Routing | react-router-dom | 7.14.0 | Client-side SPA routing |
| Data Fetching | @tanstack/react-query | 5.96.1 | Server state, caching, background refetch |
| HTTP | axios | 1.14.0 | API calls to backend |
| Charts | recharts | 3.8.1 | All data visualisations |
| Styling | Tailwind CSS | 3.4.19 | Utility-first CSS |
| Icons | lucide-react | 1.7.0 | Icon set |
| Date utils | date-fns | 4.1.0 | Date formatting and arithmetic |

### Infrastructure

| Component | Technology | Notes |
|-----------|-----------|-------|
| Database | PostgreSQL (GCP Cloud SQL) | `ca_db` database, `us-central1` region |
| Backend hosting | Google Cloud Run | Containerised, auto-scales |
| Frontend hosting | Google Cloud Run (Nginx) | SPA with `/api` proxy to backend |
| AI provider | Google Gemini | `gemini-2.5-flash` model |
| Container | Docker | Both frontend and backend Dockerfiles present |
| Local dev (backend) | Uvicorn | `start_local.bat` / `start_local.ps1` |
| Local dev (frontend) | Vite dev server | Proxy `/api` → `localhost:8000` |

---

## 5. Database Layer

**Database:** PostgreSQL (GCP Cloud SQL, instance `call-analystics-project:us-central1:ca`)
**Connection:** Unix socket via `?host=/cloudsql/...` in Cloud Run; direct TCP locally.

### Table: `call_records`

The primary table storing one row per processed call. Every column except PK is populated either from the transcript header (metadata fields) or by Gemini AI analysis.

| Column | Type | Description |
|--------|------|-------------|
| `call_id` | BIGINT PK | Unique call identifier |
| `call_date` | DATE | Date the call took place |
| `call_start_time` | TIMESTAMP | Start of call |
| `call_end_time` | TIMESTAMP | End of call (duration derivable) |
| `caller_name` | VARCHAR(50) | Customer's full name |
| `caller_nric` | VARCHAR(15) | Masked NRIC e.g. SXXXX342C |
| `caller_dob` | DATE | Customer date of birth |
| `caller_number` | VARCHAR(15) | Customer phone number |
| `agent_name` | VARCHAR(30) | Call centre agent who handled the call |
| `policy_number` | VARCHAR(25) | Insurance policy reference e.g. MLS-LIF-2022-60034 |
| `call_sentiment` | SMALLINT | AI output: 1=Positive, 0=Neutral, -1=Negative |
| `call_intent1` | VARCHAR(100) | Primary call intent (AI-classified) |
| `call_intent2` | VARCHAR(100) | Secondary intent (if present) |
| `call_intent3` | VARCHAR(100) | Tertiary intent (if present) |
| `followup_item1` | VARCHAR(100) | AI-generated follow-up action 1 |
| `followup_item2` | VARCHAR(100) | AI-generated follow-up action 2 |
| `followup_item3` | VARCHAR(100) | AI-generated follow-up action 3 |
| `escalation_flag` | CHAR(3) | 'Yes'/'No' — was call escalated |
| `compliance_flag` | CHAR(3) | 'Yes'=PASSED, 'No'=FAILED compliance protocol |
| `call_resolved_flag` | CHAR(3) | 'Yes'/'No' — was customer's issue resolved |
| `preverified_flag` | CHAR(3) | 'Yes'/'No' — was caller identity pre-verified |
| `triggerword_flag` | CHAR(3) | 'Yes'/'No' — trigger words detected |
| `triggerwords` | VARCHAR(100) | Comma-separated list of trigger words found |
| `call_summary` | TEXT | AI-generated 2–4 sentence plain-English summary |
| `file_name` | VARCHAR(100) | Source transcript filename |
| `repeatcall_flag` | CHAR(3) | 'Yes'/'No' — same caller called again recently |
| `transcript` | TEXT | Full raw transcript text |

### Table: `call_followups`

Stores action items extracted from calls, with a full approval lifecycle.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK (autoincrement) | Follow-up row ID |
| `call_id` | BIGINT (indexed) | Foreign key to `call_records.call_id` |
| `text` | VARCHAR(500) | The follow-up action description |
| `reason` | TEXT | Transcript snippet explaining why this was generated |
| `source` | VARCHAR(20) | `'ai_generated'` or `'manual'` |
| `status` | VARCHAR(20) | `'pending'` → `'approved'`/`'rejected'` → `'in_progress'` → `'completed'` |
| `priority` | VARCHAR(10) | `'low'`, `'medium'`, or `'high'` |
| `assigned_to` | VARCHAR(50) | Name of person responsible |
| `due_date` | DATE | Target completion date |
| `approved_by` | VARCHAR(50) | Name of supervisor who approved |
| `approved_at` | TIMESTAMP | When approval was given |
| `completed_at` | TIMESTAMP | When marked complete |
| `completion_notes` | TEXT | Notes added on completion |
| `created_at` | TIMESTAMP | Auto-set on insert |
| `updated_at` | TIMESTAMP | Auto-updated on any change |

### Table: `ai_usage`

Single-row table (always `id=1`) tracking Gemini API usage counts for display in the dashboard badge.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INTEGER PK | Always `1` |
| `calls_today` | INTEGER | Gemini calls made today (auto-resets each day) |
| `total_calls` | INTEGER | Lifetime Gemini call count |
| `period_date` | DATE | Date that `calls_today` is counted against |
| `last_reset_at` | TIMESTAMP | When `calls_today` last auto-reset |
| `last_call_at` | TIMESTAMP | Timestamp of most recent Gemini call |
| `last_model` | VARCHAR(80) | Model name of most recent call |
| `last_endpoint` | VARCHAR(80) | Endpoint name of most recent call |

---

## 6. Backend — FastAPI

### 6.1 Entry Point & Startup

**`backend/main.py`**

- Creates the FastAPI app with title `"Manulife CC Analytics API"`
- Registers CORS middleware (origins from `config.CORS_ORIGINS`)
- Mounts all 6 routers under `/api` prefix
- On startup, runs `Base.metadata.create_all()` to create tables if they do not exist
- Also runs several `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements to handle schema implementations without a implementation tool
- Cleans up duplicate AI-generated follow-up rows (deduplication on `(call_id, text)`)
- Exposes `/health` and `/api/health` endpoints returning `{"status": "ok", "records": <count>}`

### 6.2 Configuration

**`backend/config.py`**

- `DB_URL` — PostgreSQL connection string, read from `DB_URL` env var; defaults to Cloud SQL Unix socket URL
- `CORS_ORIGINS` — comma-separated from `CORS_ORIGINS` env var; defaults to `["http://localhost:5173", "http://localhost:3000"]`
- `BENCHMARKS` — dictionary of KPI thresholds used across the backend and mirrored in the frontend:

```python
BENCHMARKS = {
    "escalation_pct":      10.0,   # ≤10% target
    "compliance_fail_pct":  5.0,   # ≤5% failure rate
    "resolution_pct":      80.0,   # ≥80% resolution
    "preverified_pct":     80.0,   # ≥80% pre-verified
    "trigger_word_pct":     3.0,   # ≤3% trigger word rate
    "repeat_call_pct":     20.0,   # ≤20% repeat calls
}
```

### 6.3 Database Session Management

**`backend/database.py`**

- Creates a SQLAlchemy `engine` with `pool_pre_ping=True` (validates connections before use)
- `SessionLocal` — session factory, `autocommit=False`, `autoflush=False`
- `get_db()` — FastAPI dependency generator: yields a session and ensures it is closed in a `finally` block
- `Base` — declarative base class imported by all models

### 6.4 ORM Models

**`backend/models.py`** — Three SQLAlchemy models:
- `CallRecord` → `call_records` table (29 columns)
- `CallFollowup` → `call_followups` table (16 columns)
- `AiUsage` → `ai_usage` table (8 columns)

### 6.5 Routers

#### `routers/calls.py` — Call Records

- `GET /api/calls` — paginated call list with optional filters: `start_date`, `end_date`, `agent`, `sentiment`, `intent`, `search`. Returns call rows plus pagination metadata.
- `GET /api/calls/{call_id}` — full detail for a single call, including all AI-extracted fields and the raw transcript.

#### `routers/dashboard.py` — Dashboard Summary

- `GET /api/dashboard/summary` — returns all 8 headline KPIs computed as SQL aggregations over `call_records`:
  - Total calls, average sentiment, escalation %, compliance fail %, resolution %, pre-verified %, trigger word %, repeat call %
  - Each KPI includes its benchmark value and a `status` field (`ok` / `warn` / `critical`)
  - Also returns today's call count, follow-up status counts, and basic agent breakdown

#### `routers/agents.py` — Agent Performance

- `GET /api/agents` — list all agents with their aggregated performance metrics (total calls, avg sentiment, escalation %, compliance fail %, resolution %, repeat %)
- `GET /api/agents/{agent_name}` — detailed breakdown for one agent including monthly trend data and recent calls

#### `routers/analytics.py` — Analytics Deep-Dives (20+ endpoints)

All endpoints accept optional `start_date`, `end_date`, and `agent` query parameters for filtering.

| Endpoint | Data Returned |
|----------|--------------|
| `GET /api/analytics/intents/pareto` | Intent frequency ranked (Pareto chart data) |
| `GET /api/analytics/intents/trend` | Intent volume over time |
| `GET /api/analytics/escalations/by-agent` | Escalation rate per agent |
| `GET /api/analytics/escalations/trend` | Escalation rate over time |
| `GET /api/analytics/escalations/root-cause` | Intents most associated with escalations |
| `GET /api/analytics/compliance/by-agent` | Compliance fail rate per agent |
| `GET /api/analytics/compliance/trend` | Compliance trend over time |
| `GET /api/analytics/sentiment/daily` | Daily average sentiment |
| `GET /api/analytics/sentiment/monthly` | Monthly average sentiment |
| `GET /api/analytics/sentiment/by-agent` | Average sentiment per agent |
| `GET /api/analytics/resolution/overview` | Resolution rates overview |
| `GET /api/analytics/resolution/trend` | Resolution rate trend |
| `GET /api/analytics/resolution/repeat-calls/trend` | Repeat call rate trend |
| `GET /api/analytics/resolution/repeat-calls/by-agent` | Repeat call rate per agent |
| `GET /api/analytics/resolution/preverified` | Pre-verification rate data |
| `GET /api/analytics/friction/friction-points` | Top friction intents scored by neg+escalation+repeat |
| `GET /api/analytics/friction/trigger-words/counts` | Trigger word frequency counts |
| `GET /api/analytics/friction/trigger-words/trend` | Trigger word rate over time |
| `GET /api/analytics/marketing/opportunities` | Intents with positive sentiment and resolution potential |

#### `routers/ai.py` — AI Q&A

- `POST /api/ai/ask` — accepts `{"question": "..."}`, calls `ai_service.ask()`, returns question + markdown answer + the data context that was injected
- `GET /api/ai/suggested-questions` — returns the 10 pre-defined suggested question strings
- `GET /api/ai/usage` — returns current `ai_usage` row (calls today, total, last model, etc.)

#### `routers/followups.py` — Follow-up CRUD

Two routers registered:
- `router` with prefix `/api/calls/{call_id}/followups` — nested under a specific call
- `global_router` with prefix `/api/followups` — global view across all calls

Key endpoints:

| Endpoint | Action |
|----------|--------|
| `GET /api/calls/{call_id}/followups` | List follow-ups for a call; seeds AI items on first read |
| `POST /api/calls/{call_id}/followups` | Create a manual follow-up |
| `PATCH /api/followups/{id}/approve` | Set `status='approved'`, record `approved_by`, `approved_at` |
| `PATCH /api/followups/{id}/reject` | Set `status='rejected'` |
| `PATCH /api/followups/{id}/status` | Update status to `in_progress` or `completed` |
| `PUT /api/followups/{id}` | Full update (text, priority, assigned_to, due_date) |
| `DELETE /api/followups/{id}` | Delete a follow-up row |
| `GET /api/followups` | Global list with filtering by status, agent, date |
| `GET /api/followups/summary` | Counts grouped by status (for dashboard widget) |

**Seeding logic (`_seed_ai_items`):** When a call's follow-ups are first fetched, the function reads `followup_item1/2/3` from `call_records` and inserts them as `call_followups` rows with `source='ai_generated'` and `status='pending'`. It also calls `_extract_reason()` to find a relevant transcript snippet as the `reason` field.

### 6.6 Services

#### `services/ai_service.py` — Gemini AI

- **Model initialisation** — lazy singleton via `_get_model()`; reads `GEMINI_API_KEY` and `GEMINI_MODEL` (defaults to `gemini-2.5-flash`) from `.env`
- **`_build_context(db)`** — executes 6 SQL queries to assemble a plain-text analytics snapshot:
  - Overall KPI summary (total calls, avg sentiment, all 6 benchmark KPIs, date range)
  - Top 8 call intents by volume
  - Per-agent performance table (7 metrics per agent)
  - Monthly trend (call count, avg sentiment, escalation %, resolution %)
  - Top 10 trigger words by occurrence count
  - Top 5 friction points (scored: neg_sentiment×40% + escalation×35% + repeat×25%)
- **`ask(question, db)`** — builds the context string, calls `model.generate_content(context + question)`, logs the call via `_log_ai_call()`, returns `{question, answer, data_context}`
- **`_log_ai_call(model, endpoint)`** — upserts into `ai_usage` using PostgreSQL `ON CONFLICT DO UPDATE`, auto-resets `calls_today` if the date has changed
- **`SYSTEM_PROMPT`** — instructs Gemini to act as a call center analytics AI, defines the 5 agents by name and specialty, sets KPI benchmark rules
- **`SUGGESTED_QUESTIONS`** — 10 pre-written questions covering top drivers of escalation, compliance issues, automation opportunities, coaching recommendations, etc.

#### `services/analytics_service.py` — Analytics Aggregations

Contains all SQL aggregation functions called by `analytics.py` router. Each function:
- Accepts `db: Session`, optional `start_date`, `end_date`, `agent` strings
- Builds a parameterised SQL query (no string concatenation with user input)
- Returns Python dicts/lists that FastAPI serialises to JSON

### 6.7 Schemas

**`backend/schemas/`** — Pydantic v2 models for request validation and response serialisation:

- `call_schemas.py` — `CallOut`, `CallListOut`, `CallDetailOut` (includes transcript + all AI fields)
- `dashboard_schemas.py` — `DashboardSummary`, `KpiMetric` (value + benchmark + status)
- `agent_schemas.py` — `AgentOut`, `AgentDetailOut`
- `followup_schemas.py` — `FollowupOut`, `FollowupCreate`, `FollowupUpdate`, `FollowupApprove`, `FollowupStatusUpdate`, `FollowupSummary`, `FollowupsResponse`
- `ai_schemas.py` — `AiAskRequest`, `AiAskResponse`, `AiUsageOut`

### 6.8 Data Seeding & Loading Scripts

| Script | Purpose |
|--------|---------|
| `load_transcripts.py` | Standalone script (uses raw psycopg2, not FastAPI). Parses `.txt` transcript files by splitting header metadata from dialogue body. Inserts into PostgreSQL. The transcript header contains structured key-value pairs (Call_ID, Agent_Name, Policy_Number, etc.); the body contains the conversation lines. |
| `generate_summaries.py` | Standalone script to retroactively generate AI summaries for call records that were ingested without AI analysis. |
| `backend/seed_agents.py` | Seeds sample agent records for development |
| `backend/seed_aug_sep.py` | Seeds August–September sample call data |
| `backend/seed_full_year.py` | Seeds a full year of synthetic call records |
| `backend/seed_variation.py` | Seeds varied call records for analytics testing |
| `backend/populate_transcripts.py` | Batch-populates transcript text into existing call records |
| `backend/patch_transcripts.py` | Patches/corrects transcript data already in the database |
| `backend/insert_from_excel.py` | Imports call records from Excel spreadsheet format |

---

## 7. Frontend — React / Vite

### 7.1 Entry Point & Routing

**`frontend/src/main.tsx`** — wraps the app in:
- `QueryClientProvider` (TanStack Query)
- `BrowserRouter` (react-router-dom)
- `ThemeProvider` (custom dark/light context)

**`frontend/src/App.tsx`** — defines all 15+ routes:

| Route | Page | Description |
|-------|------|-------------|
| `/` | `DashboardPage` | Main KPI dashboard |
| `/calls` | `CallLogPage` | Paginated call list with filters |
| `/calls/:id` | `CallDetailPage` | Individual call transcript + AI analysis |
| `/agents` | `AgentsPage` | Agent performance table |
| `/agents/:name` | `AgentDetailPage` | Per-agent drill-down |
| `/sentiment` | `SentimentPage` | Sentiment trend charts |
| `/escalations` | `EscalationsPage` | Escalation analytics |
| `/compliance` | `CompliancePage` | Compliance analytics |
| `/resolution` | `ResolutionPage` | Resolution + repeat call analytics |
| `/intents` | `IntentsPage` | Intent Pareto + trend |
| `/trigger-words` | `TriggerWordsPage` | Trigger word cloud + treemap |
| `/friction` | `FrictionPage` | Friction point scoring |
| `/followups` | `FollowupsPage` | Follow-up management (per call) |
| `/followups/overview` | `FollowupsOverviewPage` | Global follow-up list with approval actions |
| `/ai-insights` | `AIInsightsPage` | Natural language Q&A chat UI |
| `/live` | `LiveCallPage` | Live call monitoring |
| `/marketing` | `MarketingPage` | Marketing opportunity insights |
| `/login` | `LoginPage` | Login screen |

### 7.2 Pages

**`DashboardPage`** — the homepage. Calls `GET /api/dashboard/summary` and renders:
- 8 KPI hero cards with benchmark indicators (green/amber/red)
- KPI health trend chart
- Outcome mix donut chart
- Follow-up status widget
- AI command centre (quick access to AI chat)
- Overall health gauge

**`CallLogPage`** — searchable, filterable table of all calls. Supports filtering by date range, agent, sentiment, and free-text search. Pagination handled client-side via TanStack Query. Exports to CSV.

**`CallDetailPage`** — shows the full AI analysis panel for one call: sentiment badge, intents, trigger words, compliance flag, resolution flags, call summary, follow-up items. Also renders the raw transcript with speaker labels highlighted. The `AiAgentPanel` component shows the follow-up workflow for that call.

**`AgentsPage`** — sortable table of all agents with KPI columns. Each row links to `AgentDetailPage`.

**`AgentDetailPage`** — per-agent view with radar chart (multi-KPI comparison), monthly sentiment trend, recent calls list, and individual KPI badges.

**`SentimentPage`** — sentiment trend line chart (daily/monthly toggle), sentiment distribution donut, and by-agent bar chart.

**`EscalationsPage`** — escalation rate by agent (horizontal bar), escalation trend line, and root-cause analysis (which intents drive escalations most).

**`CompliancePage`** — compliance fail rate by agent and trend over time.

**`ResolutionPage`** — resolution rate overview, trend, repeat call trend, repeat calls by agent, and pre-verified rate chart.

**`IntentsPage`** — Pareto chart (80/20 intent distribution), intent trend over time, and marketing opportunity intents.

**`TriggerWordsPage`** — word cloud visualisation (`TriggerWordCloud`) and treemap (`TriggerTreemapChart`) of trigger word frequencies.

**`FrictionPage`** — friction point scoring table: each intent scored by weighted formula (negative sentiment × 40% + escalation rate × 35% + repeat call rate × 25%).

**`FollowupsPage`** — per-call follow-up management. Lists AI-generated and manual follow-ups for a specific call, allows approve/reject/assign actions.

**`FollowupsOverviewPage`** — global view of all follow-ups across all calls. Filter by status. Approve, reject, assign priority and owner, mark in-progress, mark completed.

**`AIInsightsPage`** — chat interface. Displays suggested questions as chips. User submits a question, the answer streams back as formatted markdown. Shows the injected data context toggle.

### 7.3 Components

**`components/ai/`**
- `AiCopilot.tsx` — main chat orchestrator component
- `AiChatMessage.tsx` — renders a single message bubble (user or AI)
- `TypewriterText.tsx` — animates AI responses character by character
- `AiThinkingState.tsx` — animated "thinking" indicator while waiting
- `AiOrbIcon.tsx` — animated orb icon used in the AI UI
- `AiBadge.tsx` — small inline badge for AI-labelled items
- `SuggestedQuestions.tsx` — renders suggested question chips

**`components/charts/`** — 18 Recharts-based chart components:
- `SentimentTrendChart`, `SentimentDonutChart`
- `EscalationByAgentChart`
- `ComplianceByAgentChart`
- `ResolutionDonutChart`
- `IntentParetoChart`
- `TriggerWordCloud`, `TriggerTreemapChart`
- `AgentRadarChart`, `AgentScorecardChart`, `AgentSentimentChart`
- `CallVolumeTrendChart`, `AvgHandleTimeChart`
- `KpiHealthTrendChart`, `OutcomeMixChart`
- `HorizontalBarChart`, `TrendLineChart`

**`components/dashboard/`**
- `KpiHeroCard` — large KPI tile with value, benchmark, and status colour
- `HealthGauge` — circular gauge showing overall health score
- `FollowupStatusWidget` — mini breakdown of follow-up counts by status
- `AiCommandCenter` — shortcut panel for AI insights
- `MiniDonut`, `MiniStat`, `ProgressBar`, `RadialProgress` — small widget primitives

**`components/layout/`**
- `MainLayout` — wraps all authenticated pages with Sidebar + TopBar
- `Sidebar` — left navigation with page links grouped by category
- `TopBar` — header with date filter, agent filter, theme toggle, AI usage badge
- `AiUsageBadge` — shows `calls_today` / `total_calls` from `ai_usage` table

**`components/shared/`**
- `GlassPanel` — frosted-glass card container
- `FilterBar` — date range + agent filter inputs
- `BenchmarkIndicator` — green/amber/red dot + label showing KPI vs benchmark
- `ChartInsight` — AI-generated text insight below charts
- `EmptyState` — no-data placeholder
- `LoadingSpinner` / `Skeleton` — loading states

### 7.4 API Client Layer

**`frontend/src/api/client.ts`** — Axios instance with `baseURL = '/api'`. The Vite dev server proxies `/api` to `http://localhost:8000`.

Each domain file exports typed async functions:
- `api/calls.ts` — `getCalls(filters)`, `getCall(id)`
- `api/dashboard.ts` — `getDashboardSummary()`
- `api/agents.ts` — `getAgents()`, `getAgent(name)`
- `api/analytics.ts` — one function per analytics endpoint
- `api/ai.ts` — `askAi(question)`, `getSuggestedQuestions()`, `getAiUsage()`
- `api/followups.ts` — full CRUD: `getFollowups(callId)`, `approveFollowup(id)`, `rejectFollowup(id)`, `updateFollowupStatus(id, status)`, `getGlobalFollowups(filters)`, `getFollowupSummary()`

### 7.5 State Management & Context

TanStack Query is used for all server state (no Redux/Zustand). Each page uses `useQuery` hooks with appropriate cache keys. Mutations (approve, reject, update) use `useMutation` with query invalidation on success.

**`context/FilterContext.tsx`** — React Context providing global `startDate`, `endDate`, and `agentFilter` state. The `TopBar` component writes these; all analytics pages read them and pass as query parameters.

**`context/ThemeContext.tsx`** — React Context for `dark` / `light` theme toggle. Applies a CSS class to the document root; Tailwind `dark:` variants handle all colour switching.

### 7.6 Utilities & Hooks

- `utils/benchmarks.ts` — KPI threshold values (mirrors `config.py` `BENCHMARKS`), and `getBenchmarkStatus(kpi, value)` returning `'ok'|'warn'|'critical'`
- `utils/formatters.ts` — `formatDate()`, `formatPct()`, `formatSentiment()` helpers
- `utils/colors.ts` — named colour constants for chart series consistency
- `utils/csvExport.ts` — converts an array of objects to CSV and triggers a browser download
- `hooks/useDateRange.ts` — reads `startDate`/`endDate` from `FilterContext`, returns as a structured object ready for API calls
- `hooks/useIsLightTheme.ts` — boolean hook derived from `ThemeContext`

---

## 8. AI Integration — Gemini

The AI layer uses **Gemini 2.5 Flash** (`gemini-2.5-flash`) via the `google-generativeai` Python SDK.

### How the AI Q&A works

1. User submits a natural language question via the frontend chat UI
2. `POST /api/ai/ask` is called with `{"question": "..."}`
3. `_build_context(db)` runs 6 SQL queries against `call_records` and assembles a structured plain-text snapshot of the entire dataset — KPIs, agent performance, intent distribution, monthly trends, trigger words, and friction scores
4. The context + question are sent to Gemini as a single `generate_content()` call
5. Gemini responds with a markdown-formatted answer grounded in the live data
6. The response is returned to the frontend and rendered as formatted markdown using `AiMarkdown.tsx`
7. `_log_ai_call()` increments the `ai_usage` counter

### System Prompt (SYSTEM_PROMPT)

Instructs Gemini to:
- Act as a call center analytics expert
- Always back answers with specific numbers from the injected context
- Use markdown formatting (headers, bold, bullet points)
- Be actionable and direct (operational decision-making context)
- Know the 5 named agents and their specialisms: Sam (Claims & Grievances), John (Policy Services), David (Escalations & Quality), Mike (New Business & Renewals), Mary (Billing & Amendments)

### AI Usage Tracking

Every `ask()` call triggers `_log_ai_call()` which upserts a single row (`id=1`) in `ai_usage`. The `calls_today` field auto-resets if `period_date != CURRENT_DATE`. The frontend `AiUsageBadge` component polls this endpoint to show live usage counts.

---

## 9. Follow-up Workflow State Machine

```
[AI generates followup_item1/2/3 during transcript analysis]
                    ↓
             [PENDING] ← default on first seed
            /         \
   [APPROVED]       [REJECTED] ← supervisor decision
        ↓                ↓
  [IN_PROGRESS]     (preserved for audit)
        ↓
  [COMPLETED] ← call centre staff marks done with completion_notes
```

**Seeding trigger:** The first `GET /api/calls/{call_id}/followups` request triggers `_seed_ai_items()`, which reads `followup_item1/2/3` from `call_records` and creates `call_followups` rows if they do not already exist. The `reason` field is populated by scanning the transcript for relevant keywords from the follow-up text.

**Deduplication:** On startup, `main.py` deletes duplicate `ai_generated` follow-ups keeping only the earliest (`MIN(id)`) per `(call_id, text)` pair.

---

## 10. KPI Benchmarks

These thresholds are defined in `backend/config.py` and mirrored in `frontend/src/utils/benchmarks.ts`.

| KPI | Benchmark | Direction | Meaning |
|-----|-----------|-----------|---------|
| Escalation Rate | ≤ 10% | Lower is better | % of calls escalated |
| Compliance Fail Rate | ≤ 5% | Lower is better | % of calls where agent failed compliance protocol |
| Resolution Rate | ≥ 80% | Higher is better | % of calls where customer issue was resolved |
| Pre-Verified Rate | ≥ 80% | Higher is better | % of calls where caller was pre-verified before connecting |
| Trigger Word Rate | ≤ 3% | Lower is better | % of calls containing trigger/sensitive words |
| Repeat Call Rate | ≤ 20% | Lower is better | % of calls from customers who called again for the same issue |

Each KPI is assessed as:
- **`ok`** — within benchmark
- **`warn`** — approaching threshold
- **`critical`** — breaching benchmark

---

## 11. Deployment & Infrastructure

### Local Development

**Backend:**
```bash
cd backend
pip install -r requirements.txt
# Set GEMINI_API_KEY, DB_URL in .env
uvicorn main:app --reload --port 8000
# OR: run start_local.bat / start_local.ps1
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev      # Vite dev server on port 5173; proxies /api to localhost:8000
```

### Production (Google Cloud Run)

Both services are containerised:

**Backend Dockerfile:** `python:3.13-slim` → installs requirements → copies code → runs `uvicorn main:app --host 0.0.0.0 --port 8080`

**Frontend Dockerfile:** multi-stage — `node:alpine` builds the Vite app → `nginx:alpine` serves `dist/` with SPA fallback. `nginx.conf.template` proxies `/api` to the backend Cloud Run URL (injected at container start via `envsubst`).

**Cloud SQL:** Connected to Cloud Run via Unix socket (`?host=/cloudsql/<instance-connection-name>`). The instance is `call-analystics-project:us-central1:ca`, database `ca_db`.

**Environment variables required at runtime:**

| Variable | Purpose |
|----------|---------|
| `DB_URL` | Cloud SQL connection string |
| `GEMINI_API_KEY` | Google AI Studio API key |
| `GEMINI_MODEL` | Model name (defaults to `gemini-2.5-flash`) |
| `CORS_ORIGINS` | Comma-separated allowed origins |

---

## 12. Dependencies

### Backend (`backend/requirements.txt`)

```
fastapi==0.115.0           # REST API framework
uvicorn[standard]==0.30.6  # ASGI server
psycopg2-binary==2.9.9     # PostgreSQL driver
sqlalchemy==2.0.36         # ORM
pydantic==2.9.2            # Data validation / serialisation
httpx==0.27.2              # HTTP client
python-dotenv==1.0.1       # .env file loading
google-generativeai>=0.8.0 # Gemini AI SDK
```

### Frontend (`frontend/package.json`)

**Production dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| react | ^19.2.4 | UI framework |
| react-dom | ^19.2.4 | DOM renderer |
| react-router-dom | ^7.14.0 | Client-side routing |
| @tanstack/react-query | ^5.96.1 | Server state management |
| axios | ^1.14.0 | HTTP client |
| recharts | ^3.8.1 | Chart library |
| lucide-react | ^1.7.0 | Icon set |
| date-fns | ^4.1.0 | Date utilities |
| react-is | ^19.2.4 | React type checking utility |

**Dev dependencies:**

| Package | Version | Purpose |
|---------|---------|---------|
| vite | ^8.0.1 | Build tool + dev server |
| typescript | ~5.9.3 | TypeScript compiler |
| tailwindcss | ^3.4.19 | CSS framework |
| @vitejs/plugin-react | ^6.0.1 | Vite React plugin (SWC) |
| eslint + plugins | ^9.39.4 | Linting |
| postcss + autoprefixer | latest | CSS post-processing |

---

## 13. Key Data Flows

### Flow 1: Transcript Ingestion

```
Raw .txt file
    ↓
load_transcripts.py
    ├── Parse header key-value pairs (Call_ID, Agent_Name, etc.)
    ├── Parse dialogue body (speaker-labelled lines)
    └── INSERT into call_records (metadata fields populated; AI fields left NULL)
                    ↓
        [AI analysis happens separately via generate_summaries.py]
```

### Flow 2: AI Analysis (per call)

```
call_records row (transcript + metadata)
    ↓
Gemini 2.5 Flash (google-generativeai)
    ↓ (7 analysis tasks)
    ├── call_sentiment          (-1 / 0 / 1)
    ├── call_intent1/2/3        (up to 3 categories)
    ├── triggerword_flag        + triggerwords CSV
    ├── compliance_flag         (Yes=PASS / No=FAIL)
    ├── followup_item1/2/3      (up to 3 action items)
    ├── escalation_flag + call_resolved_flag + preverified_flag + repeatcall_flag
    └── call_summary            (2–4 sentences plain English)
    ↓
UPDATE call_records (fill AI columns)
    ↓
_seed_ai_items() → INSERT call_followups rows (status='pending')
```

### Flow 3: Dashboard Load

```
Browser → GET /api/dashboard/summary
    ↓
dashboard.py router
    ↓
SQL COUNT/AVG/SUM aggregations over call_records
    ↓
JSON response with 8 KPIs + benchmark statuses
    ↓
DashboardPage renders KpiHeroCard × 8 + charts
```

### Flow 4: Follow-up Approval

```
Supervisor opens FollowupsOverviewPage
    ↓
GET /api/followups → list all pending follow-ups
    ↓
Supervisor clicks "Approve" on a follow-up item
    ↓
PATCH /api/followups/{id}/approve
    → sets status='approved', approved_by, approved_at
    ↓
Call centre staff opens follow-up in their queue
    ↓
PATCH /api/followups/{id}/status  (body: {status: 'in_progress'})
    ↓
PATCH /api/followups/{id}/status  (body: {status: 'completed', completion_notes: '...'})
    → sets completed_at
```

### Flow 5: AI Q&A Chat

```
Supervisor types question in AIInsightsPage
    ↓
POST /api/ai/ask  {"question": "Which agent has highest escalation?"}
    ↓
_build_context(db) — 6 SQL queries → plain-text snapshot of live data
    ↓
Gemini 2.5 Flash: SYSTEM_PROMPT + context + question → generate_content()
    ↓
Markdown answer (grounded in live numbers)
    ↓
_log_ai_call() → upsert ai_usage row
    ↓
Frontend renders answer via AiMarkdown.tsx with TypewriterText animation
```

---

*Generated: 2026-06-18*
