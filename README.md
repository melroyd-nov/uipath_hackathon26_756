# Acme Call Center Analytics  Built on UiPath

> Hackathon `hackathon26_756` · UiPath Cloud (Staging) · An UiPath-native-powered call-center
> analytics platform built on UiPath (Maestro Flow, Coded Agents, Data Fabric, Coded App).

Acme is an insurance contact centre. Every customer call produces an audio recording. This project
turns that audio into structured, analyzed, supervisor-reviewed insight and surfaces it on a live
KPI dashboard.

### Why UiPath

Going into this hackathon, the obvious way to build a call-center analytics platform is the usual
pile of moving parts  a FastAPI backend, a hand-rolled orchestrator, a Postgres database, a
bolted-on approval flow, and a Docker/GCR deployment to babysit. None of which you can realistically
stand up, wire together, and demo in a hackathon timeframe. So instead we built it on **UiPath**, and
the whole thing collapsed into **one governed, observable, low-maintenance platform**  with
capabilities a hand-built stack would never have given us for free:

- **Maestro Flow** is the orchestrator, so we never have to hand-roll one  a **durable, resumable,
  fully-traced** process engine with retries, state, and observability built in.
- **Data Fabric** is the system of record instead of self-managed Postgres  **schema-governed and
  relationship-aware**, with entities, choice sets, and native joins instead of implementations and
  connection strings.
- **Maestro BPMN + Action Center** give us a **first-class human-in-the-loop** approval workflow out
  of the box, rather than bolting approvals onto REST endpoints.
- **Coded Agents + LLM Gateway** give us governed, swappable AI with built-in usage tracking and an
  **AI Trust Layer**  enterprise-grade from day one.
- **Coded Apps** let the React dashboard talk to the system of record through the **UiPath TypeScript
  SDK**, deployed and secured by the same platform.
- **`.uipx` Solutions** package all four projects + shared resources into **one versioned,
  one-command deployable artifact**  no fragile multi-service pipeline to maintain.

In short: instead of a stack we'd have to operate, UiPath gives us a platform that operates itself 
with governance, traceability, and human oversight built in rather than bolted on.

---

## Table of Contents

1. [What this system does](#1-what-this-system-does)
2. [How we built it](#2-how-we-built-it)
3. [Architecture at a glance](#3-architecture-at-a-glance)
4. [Repository layout](#4-repository-layout)
5. [The ML analysis engine (`call_analytics_app`)](#5-the-ml-analysis-engine-call_analytics_app)
6. [The UiPath cloud agent (`call_analytics_cloud_agent`)](#6-the-uipath-cloud-agent-call_analytics_cloud_agent)
7. [The UiPath solution (`uipath_hackathon`)](#7-the-uipath-solution-uipath_hackathon)
8. [Data Fabric schema](#8-data-fabric-schema)
9. [End-to-end data flow](#9-end-to-end-data-flow)
10. [Local development & run](#10-local-development--run)
11. [Target environment & deployment](#11-target-environment--deployment)
12. [Known CLI bugs & workarounds](#12-known-cli-bugs--workarounds)
13. [Project status & roadmap](#13-project-status--roadmap)
14. [Documentation index](#14-documentation-index)

---

## 1. What this system does

For each call, the platform:

1. **Ingests** the call recording (audio file).
2. Runs a **10-stage ML pipeline**: ASR → speaker diarization → role assignment → sentiment →
   audio emotion → compliance checks → follow-up extraction → call rollup.
3. Produces a structured **`CallReport`** JSON (43 analyzed fields: sentiment, intents, trigger
   words, compliance violations, fraud risk, PII detection, follow-up items, summary, talk ratios,
   etc.).
4. **Validates & enriches** that JSON and **persists** it to **Data Fabric** (`CallRecord` plus
   seeded `CallFollowup` rows).
5. Routes follow-ups through a **human-in-the-loop** approval workflow (supervisor approves/rejects).
6. Refreshes a **KPI dashboard** (8 headline KPIs + multiple analytics modules).
7. Answers **natural-language questions** over the live data.

**Agent specializations (business domain):**

| Agent | Domain |
|-------|--------|
| Sam   | Claims / Grievances |
| John  | Policy Services |
| David | Escalations / Quality |
| Mike  | New Business / Renewals |
| Mary  | Billing / Amendments |

---

## 2. How we built it

We built this solution across six components, using **Claude Code** as our coding assistant
throughout — helping us fast-track development, debug complex issues, and gain better context on how
each part of the system works together.

- **Coded Agent** — the intelligence layer of the pipeline. It leverages two UiPath-native models to
  transcribe raw call audio and perform the initial analysis, extracting sentiment, emotions, intent,
  fraud signals, compliance indicators, and trigger words, outputting a structured JSON result ready
  for downstream processing.
- **Maestro BPMN** — acts as the central orchestrator. It is triggered when a call audio file and its
  metadata are uploaded, then calls the Coded Agent to retrieve the initial analysis. The output is
  passed through a validation and enrichment step that cleans the data and structures it into 43
  fields before routing each call across four intelligent pathways: **Fraud, Compliance, Escalation,
  and Retention**. From there, it automatically seeds follow-up actions and drives the supervisor
  approval workflow.
- **UiPath Data Fabric** — serves as the system of record. All structured data produced by the JSON
  validator is persisted across three entities (`CallRecord`, `CallFollowup`, `AiUsage`), with a
  supervisor-driven human-in-the-loop approval workflow governing follow-up actions.
- **Conversational Agent (Aria)** — built on **UiPath Agent Builder**, Aria answers plain-English
  questions over live Data Fabric data in real time (e.g. *"Which agent had the most escalations this
  week?"*), giving managers instant access to insights without navigating reports.
- **UiPath Coded App** — built using React, this 17-route analytics dashboard surfaces 8 KPI tiles
  and 6 drill-down modules, giving operations and leadership a real-time view of call performance,
  compliance, sentiment, and escalation trends. Aria is integrated directly into the app, enabling
  conversational querying alongside the visual analytics.
- **UiPath Action App** — provides supervisors with a dedicated interface to review AI-generated
  follow-up actions for each call and either approve or reject them, ensuring human oversight remains
  at the centre of every decision before actions are executed.

---

## 3. Architecture at a glance

```
        ┌────────────────────────────┐
        │  Audio recording (.mp3)    │
        └──────────────┬─────────────┘
                       │
        ┌──────────────▼──────────────────────────────┐
        │  ML ANALYSIS ENGINE  (call_analytics_app)    │   local GPU server
        │  LangGraph 10-stage StateGraph               │   (faster-whisper,
        │  → CallReport JSON (43 fields)               │    pyannote, wav2vec2,
        │  exposed via FastAPI (ngrok → cloud)         │    Ollama / Claude)
        └──────────────┬───────────────────────────────┘
                       │ CallReport JSON
        ┌──────────────▼──────────────────────────────┐
        │  UiPath Maestro Flow                          │   UiPath Cloud
        │  call-center-orchestration.flow               │
        │   • Ingest JSON                               │
        │   • Sub_ValidateAndEnrichJSON (RPA)           │
        │   • Store CallRecord  + Seed CallFollowups    │
        └───────┬───────────────────────┬───────────────┘
                │                        │
   ┌────────────▼────────┐   ┌───────────▼─────────────┐
   │ Data Fabric          │   │ Maestro BPMN            │
   │ CallRecord           │   │ call-center-followup-   │
   │ CallFollowup         │◄──┤ case  (HITL approval)   │
   │ AiUsage              │   └─────────────────────────┘
   └────────────┬─────────┘
                │
   ┌────────────▼─────────────────────────┐
   │ Coded App  call-center-dashboard      │   React 18 + Vite + UiPath SDK
   │  KPIs · analytics · AI copilot Q&A    │
   └───────────────────────────────────────┘
```

### Conventional stack → UiPath equivalent

What each piece would have been in a hand-built stack, and the UiPath capability we use instead:

| Conventional approach | UiPath capability |
|---|---|
| FastAPI backend + orchestration | **Maestro Flow** (`call-center-orchestration`) |
| AI / analytics services | **Coded Agent** (`call-center-ai-agent`, Python) |
| React/Vite dashboard | **Coded App** (`call-center-dashboard`) |
| PostgreSQL tables | **Data Fabric** entities |
| Local file ingestion | **Storage Bucket** + **Time Trigger** |
| Follow-up approval workflow | **Maestro BPMN** (`call-center-followup-case`) |
| Docker / GCR deploy | **`.uipx` Solution** on Cloud Orchestrator |

---

## 4. Repository layout

```
UiPathHackathon - 2026/
├── README.md                        ← you are here
├── Claude.md                        Living project memory / source of truth
├── PROCESS_SPECIFICATION.md         Full process spec
├── JSON_TO_DATA_FABRIC_MAPPING.md   CallReport JSON → Data Fabric field map
├── DASHBOARD_DATA_COVERAGE_ANALYSIS.md
│
├── call_analytics_app/              ML ANALYSIS ENGINE (LangGraph pipeline + FastAPI)
│   └── src/call_analytics/
│       ├── audio/                   load, transcribe, diarize, align, emotion
│       ├── analysis/                roles, sentiment, compliance, followup, rollup
│       ├── api/                     FastAPI server
│       ├── graph.py                 LangGraph wiring
│       └── cli.py
│
├── call_analytics_cloud_agent/      UiPath Coded Agent wrapper around the engine
│
└── uipath_hackathon/
    ├── Docs/                        SDDs, task plan, BPMN source, build guides
    └── AcmeCallCenterAnalytics/     THE UIPATH SOLUTION (.uipx target)
        ├── solution.json            Solution manifest + dependency graph + build order
        ├── call-center-ai-agent/        Coded Agent (Python)
        ├── call-center-followup-case/   Maestro BPMN (HITL approvals)
        ├── call-center-orchestration/   Maestro Flow (orchestrator)
        ├── call-center-dashboard/       Coded App (React + UiPath TS SDK)
        └── shared/
            ├── data-fabric/         CallRecord / CallFollowup / AiUsage entities
            ├── llm-gateway/         LLM Gateway connection
            └── triggers/            Daily ingestion trigger

uipath_workflows/                    Standalone RPA workflows (.xaml)
├── Sub_ValidateAndEnrichJSON/       Validates + enriches CallReport JSON → 43-field body
└── Action_FollowUp/                 Action Center follow-up workflow
```

> **Note:** `solution.json` references `shared/storage-bucket/`, which is not yet created on disk
> (task **P1-2** is not started). Packing the solution will require either creating that folder or
> removing the reference until the storage bucket is provisioned.

---

## 5. The ML analysis engine (`call_analytics_app`)

A production-shaped port of the validated notebook `call_analytics.ipynb`. The 10-stage pipeline is
a typed **LangGraph** `StateGraph` using **LangChain** for structured (Pydantic) LLM output, with a
swappable LLM provider and **Library + CLI + FastAPI** interfaces.

```
load_audio → transcribe → diarize → align → roles → sentiment
          → emotion → compliance → followup → rollup → persist
```

- **State:** `CallState` · **Output:** `CallReport` (Pydantic  the stable contract).

### Open-source ML model stack

The entire heavy-lifting analysis layer is built on **UiPath-native, openly-licensed models**  no
proprietary black-box analytics API. Everything below runs **on our own hardware**, which means the
sensitive customer audio (PII, NRIC, policy numbers) **never leaves the local boundary** during
inference. This is a deliberate data-sovereignty choice, and it's what makes the hybrid handoff to
UiPath Cloud safe.

| Stage | Open-source model | Source / license |
|---|---|---|
| **ASR (speech-to-text)** | `deepdml/faster-whisper-large-v3-turbo-ct2` | OpenAI Whisper (MIT) via faster-whisper / CTranslate2 |
| **Speaker diarization** | `pyannote/speaker-diarization-3.1` | pyannote.audio (MIT, HF-gated) |
| **Audio emotion (SER)** | `superb/wav2vec2-base-superb-er` | wav2vec2 / SUPERB (Apache-2.0) |
| **LLM reasoning (default)** | `llama3.2` via **Ollama** (local) | Meta Llama (community license), self-hosted |
| **LLM judge (optional)** | `qwen2.5:7b` via Ollama | Qwen (Apache-2.0), self-hosted |

LLM stages (role assignment, numeric sentiment, per-rule compliance judge + PII regex, follow-up
extraction, call rollup) run on a **local Ollama** model by default  fully offline. Verified
end-to-end on an RTX 5060 (Blackwell, cu128), Python 3.13, torch 2.11.0+cu128.

### A deliberately hybrid architecture

This solution is **hybrid by design**  we put each workload exactly where it belongs:

- **Open-source / local where data is sensitive and compute is heavy.** GPU-bound ASR, diarization,
  emotion, and LLM reasoning run on-prem against open models, so raw audio and PII stay local.
- **UiPath Cloud where orchestration, governance, and business value live.** Once the audio is
  distilled into a clean `CallReport` JSON, **UiPath takes over everything that matters to the
  business**  durable orchestration, human-in-the-loop approvals, the system of record, and the
  dashboard.
- **Thin, clean seam.** The pipeline is intentionally **UiPath-agnostic** at the Python level 
  `analyze_call(audio_path) -> CallReport`  so the UiPath **Coded Agent** is a thin wrapper, and the
  UiPath-native engine and the UiPath platform evolve independently across one stable JSON contract.

Dual-purpose packaging reinforces the seam: the light deps in `pyproject.toml` form the small UiPath
cloud package, while the heavy GPU ML stack is kept out and pinned in `requirements-local-ml.txt`.

> **The net effect:** best-in-class UiPath-native ML for perception, and the full weight of the
> **UiPath platform** for orchestration, governance, and delivery  neither compromised for the other.

---

## 6. The UiPath cloud agent (`call_analytics_cloud_agent`)

The light UiPath **Coded Agent** that wraps the analysis engine. It calls `analyze_call(...)` (locally
or via the FastAPI server exposed through ngrok) and returns the `CallReport` to the Maestro Flow.
Heavy ML deps live in the engine, not here.

---

## 7. The UiPath solution (`uipath_hackathon`)

Four projects + shared resources, packaged into one `.uipx`. From `solution.json`:

| Project | Product | Depends on |
|---|---|---|
| `call-center-ai-agent` | Coded Agent | data-fabric, llm-gateway |
| `call-center-followup-case` | Maestro BPMN | data-fabric |
| `call-center-orchestration` | Maestro Flow | data-fabric, storage-bucket, trigger, ai-agent |
| `call-center-dashboard` | Coded App | data-fabric, ai-agent, followup-case |

**Build order:**

```
1. data-fabric · storage-bucket · daily-ingestion-trigger · llm-gateway   (shared)
2. call-center-ai-agent · call-center-followup-case                        (parallel)
3. call-center-orchestration
4. call-center-dashboard
```

**Dashboard stack:** React 18 + TypeScript + Vite + TanStack Query + Recharts + React Router +
Framer Motion + Lottie + `@uipath/uipath-typescript` SDK.

---

## 8. Data Fabric schema

Three entities provisioned in staging via `uip df`. Entity IDs are stable across sessions.

| Entity | ID | Fields |
|---|---|---|
| **CallRecord** | `beac40ee-bd6b-f111-8fcb-000d3ab36606` | 43 (27 original + 15 JSON-derived + agent_id) |
| **CallFollowup** | `993c2c06-be6b-f111-8fcb-000d3ab36606` | 13 user fields (+ RELATIONSHIP → CallRecord) |
| **AiUsage** | `45af032d-bb6b-f111-8fcb-000d3ab36606` | 8 user fields (singleton usage counter) |

**Choice sets** (note: `NumberId` starts at **0**, not 1):

| Choice Set | Values |
|---|---|
| YesNoFlag | yes(0), no(1) |
| FollowupSource | ai_generated(0), manual(1) |
| FollowupStatus | pending(0), approved(1), rejected(2), in_progress(3), completed(4) |
| FollowupPriority | low(0), medium(1), high(2) |

`CallRecord.call_metadata` populates `call_date`, `call_start_time`, `call_end_time`,
`caller_number`, `caller_name`, `agent_name`, `agent_id`. The 15 JSON-derived fields cover sentiment
breakdown, audio emotion, talk ratios, duration, fraud risk/reason, PII detection, follow-up
evidence, and compliance detail/counts.

See **`JSON_TO_DATA_FABRIC_MAPPING.md`** for the full field-by-field `CallReport` → entity mapping.

---

## 9. End-to-end data flow

1. **Audio in** → ML engine `analyze_call()` produces `CallReport` JSON (43 fields).
2. **Maestro Flow** ingests the JSON.
3. **`Sub_ValidateAndEnrichJSON`** (RPA, `.xaml`) validates the JSON (`JObject` in/out) and enriches
   it with precomputed fields (sentiment category, escalation flag, follow-up items/priority/assignee,
   friction score, marketing opportunity), then builds the full 43-field Data Fabric body.
4. **StoreCallRecord** inserts the `CallRecord`; **SeedFollowups** creates `CallFollowup` rows linked
   by RELATIONSHIP.
5. **Maestro BPMN** drives supervisor approval/rejection of follow-ups (FollowupStatus state machine).
6. **Coded App dashboard** queries Data Fabric for KPIs/analytics and answers NL questions.

---

## 10. Local development & run

### ML engine (full GPU runtime)

```powershell
cd call_analytics_app

# Python 3.13 venv (matches the tested runtime)
uv venv --python 3.13 --clear

# light deps + pinned ML stack, via the CUDA cu128 torch index
uv pip install -e . -r requirements-local-ml.txt `
  --extra-index-url https://download.pytorch.org/whl/cu128 `
  --index-strategy unsafe-best-match

# torchcodec must stay UNINSTALLED  its DLLs break the transformers/pyannote audio path
uv pip uninstall torchcodec

ollama pull llama3.2          # default LLM
ollama pull qwen2.5:7b        # sharper compliance/rollup -> set JUDGE_MODEL=qwen2.5:7b
```

Provide a local **`.env`** (gitignored  never committed). Copy `.env.example` and fill
`HF_TOKEN`, `API_KEY`, the proprietary `*_PROMPT` / `RUBRIC_*` blocks, and `DATA_DIR`.
Provider swap: `LLM_PROVIDER=ollama` (default) or `anthropic` (set `ANTHROPIC_API_KEY`).

```powershell
# CLI  prints CallReport JSON, writes artifacts to outputs/
.venv\Scripts\python.exe -m call_analytics run data\audio_samples\call_00.mp3

# FastAPI (host 0.0.0.0 so ngrok can expose it to the UiPath cloud agent)
uv run uvicorn call_analytics.api.main:app --host 0.0.0.0 --port 8000
```

### Dashboard (Coded App)

```powershell
cd uipath_hackathon/AcmeCallCenterAnalytics/call-center-dashboard
npm install
npm run dev        # vite dev server
npm run build      # tsc -b && vite build
```

---

## 11. Target environment & deployment

| Property | Value |
|---|---|
| Platform | UiPath Cloud (Staging) |
| Base URL | `https://staging.uipath.com` |
| Organization | `hackathon26_756` |
| Tenant | `DefaultTenant` |
| Folder | `Acme/CallCenterAnalytics` |
| CLI | `uip` (authenticated via `uip login`) |
| Shell | PowerShell 5.1 (Windows) |

Package & deploy via the `uip solution` CLI: `init → pack → publish`.
Always pass `--output json` to `uip` for parseable results, and write JSON to a file with
`Set-Content` before passing it to `--file` (avoids PowerShell quoting issues).

> Never commit secrets  `.env` files and API keys stay local.

---

## 12. Known CLI bugs & workarounds

Discovered while provisioning Data Fabric via the `uip df` CLI:

| # | Bug | Workaround |
|---|---|---|
| 1 | `choice-sets create` ignores `--body` | Use `--display-name` / `--description` flags |
| 2 | `choice-set-values create` adds one value at a time | Call once per value (no arrays) |
| 3 | `--file` silently ignores INTEGER / BIG_INTEGER values | Make INTEGER fields optional; set via UI/REST |
| 4 | `--file` fails on required fields with underscore prefix (`call_id`) | Rename (e.g. `callid`) |
| 5 | `--body` in PowerShell → JSON quoting hell | Write JSON to a file, use `--file` |
| 6 | `--body` also drops INTEGER values | Use `--file` instead |

This is why `call_id` → `callid` (STRING) and `call_sentiment` is an optional INTEGER.

---

## 13. Project status & roadmap

| Area | Status |
|---|---|
| P1-1 Data Fabric entities  | ✅ Done  provisioned in staging |
| ML analysis engine + LangGraph pipeline | ✅ Verified end-to-end |
| `Sub_ValidateAndEnrichJSON` RPA workflow | ✅ Built (JObject in/out, precomputed fields) |
| Dashboard (Coded App) | ✅ Done |
| P1-4 `.uipx` solution registration | ✅ Done |
| Maestro Flow / BPMN authoring | ✅ Done |

See **`Claude.md` §6** for the full task table and build graph.

---

## 14. Documentation index

| Doc | Purpose |
|---|---|
| `Claude.md` | Living project memory  single source of truth for project state |
| `PROCESS_SPECIFICATION.md` | Full end-to-end process specification |
| `JSON_TO_DATA_FABRIC_MAPPING.md` | `CallReport` JSON → Data Fabric field mapping |
| `DASHBOARD_DATA_COVERAGE_ANALYSIS.md` | Dashboard data vs. agent JSON coverage analysis |
| `uipath_hackathon/Docs/acme-call-center-analytics-solution-sdd.md` | Master solution SDD |
| `uipath_hackathon/Docs/call-center-*-sdd.md` | Per-project SDDs (orchestration, agent, case, dashboard) |
| `uipath_hackathon/Docs/BPMN_TASK_GUIDES/` | Per-node BPMN build guides (Tasks 01–20) |
| `uipath_hackathon/Docs/call-center-transcript-process.bpmn` | Source BPMN (imported to Studio) |

---

*Acme Call Center Analytics  built on UiPath. See `Claude.md` for detailed, continuously-updated
project state.*
