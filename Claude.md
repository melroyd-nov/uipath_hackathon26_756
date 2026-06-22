# Claude.md — Acme Call Center Analytics (UiPath Migration)

> **Purpose of this file:** This is a living project memory document. Both **Claude** (Anthropic) and **OpenCode** (kimi-k2.6) read and update this file to stay synchronized on what has been done, what decisions were made, and what the full project context is. If you are Claude reading this, treat it as the single source of truth for project state. If you are OpenCode, update it after every significant action.

---

## 1. Project Overview

We are migrating an existing **call center analytics platform** from an open-source stack to **UiPath**.

### As-Built Stack (being replaced)
- **Backend:** FastAPI + SQLAlchemy + PostgreSQL (GCP Cloud SQL)
- **AI:** Gemini 2.5 Flash via `google-generativeai` SDK
- **Frontend:** React 19 + TypeScript + Vite + TanStack Query + Recharts + Tailwind CSS
- **Deployment:** Docker → Google Cloud Run
- **Data:** 3 PostgreSQL tables — `call_records`, `call_followups`, `ai_usage`

### UiPath Target Stack
| As-Built | UiPath Replacement |
|---|---|
| FastAPI backend + orchestration | **Maestro Flow** (`call-center-orchestration`) |
| AI service (`ai_service.py` + `analytics_service.py`) | **Coded Agent** (`call-center-ai-agent`, Python) |
| React/Vite dashboard (17 routes, 18 charts) | **Coded App** (`call-center-dashboard`) |
| PostgreSQL tables | **Data Fabric** entities |
| Local file ingestion (`transcripts.zip`) | **Orchestrator Storage Bucket** + **Time Trigger** |
| Follow-up approval workflow | **Maestro BPMN** (`call-center-followup-case`) |
| Docker / GCR deployment | **`.uipx` Solution** deployed to Cloud Orchestrator |

### Business Context
Acme (insurance contact centre) receives customer calls. Every call produces a transcript `.txt` file. The system must:
1. Ingest the transcript
2. Run 7-way parallel AI analysis (sentiment, intents, trigger words, compliance, follow-ups, resolution flags, summary)
3. Persist to Data Fabric (`CallRecord` + seeded `CallFollowup` rows)
4. Supervisor reviews/approves/rejects follow-ups (human-in-the-loop)
5. Refresh KPI dashboard (8 headline KPIs + 6 analytics modules)
6. Natural-language Q&A over live data

**Agents:** Sam=Claims/Grievances, John=Policy Services, David=Escalations/Quality, Mike=New Business/Renewals, Mary=Billing/Amendments.

---

## 2. Target Environment

| Property | Value |
|---|---|
| **Platform** | UiPath Cloud (Staging) |
| **Base URL** | `https://staging.uipath.com` |
| **Organization** | `hackathon26_756` |
| **Tenant** | `DefaultTenant` |
| **Folder** | `Acme/CallCenterAnalytics` (target) |
| **CLI** | `uip` (UiPath CLI) — authenticated via `uip login` |
| **Shell** | PowerShell 5.1 (Windows) |

> **Important:** Always use `--output json` with `uip` CLI for parseable results. Use `Set-Content` to write JSON to files before passing to `--file` (avoids PowerShell quoting hell).

---

## 3. Solution Architecture

The solution consists of **4 projects** + **shared resources**, packaged into one `.uipx`:

```
AcmeCallCenterAnalytics/
├── solution.json                          # Solution manifest
│
├── call-center-orchestration/             # Maestro Flow
│   ├── call-center-orchestration.flow     # EMPTY — not yet built
│   ├── project.uiproj
│   ├── entry-points.json
│   ├── bindings_v2.json
│   ├── operate.json
│   └── package-descriptor.json
│
├── call-center-ai-agent/                  # Coded Agent (Python)
│   ├── agent.json                         # EMPTY — not yet built
│   ├── src/tools/extraction.py            # EMPTY
│   ├── src/tools/analytics.py             # EMPTY
│   ├── src/tools/qa.py                    # EMPTY
│   ├── src/data_fabric_client.py          # EMPTY
│   ├── src/prompts/system_prompt.py       # EMPTY
│   ├── requirements.txt
│   └── evals/extraction_eval_set.json     # EMPTY
│
├── call-center-followup-case/             # Maestro BPMN
│   ├── call-center-followup-case.bpmn     # EMPTY — not yet built
│   ├── project.uiproj
│   ├── entry-points.json
│   ├── bindings_v2.json
│   ├── operate.json
│   └── package-descriptor.json
│
├── call-center-dashboard/                 # Coded App
│   ├── app.config.json
│   ├── src/main.tsx
│   ├── src/App.tsx                        # 17 routes scaffolded
│   ├── src/api/*.ts                       # API client files present
│   ├── package.json
│   └── tailwind.config.js
│
└── shared/                                # Provisioned resources (not buildable)
    ├── data-fabric/
    │   ├── CallRecord.entity.json         # EMPTY placeholder
    │   ├── CallFollowup.entity.json       # EMPTY placeholder
    │   └── AiUsage.entity.json            # EMPTY placeholder
    ├── storage-bucket/                    # EMPTY placeholder
    ├── triggers/
    │   └── daily-ingestion-trigger.json   # EMPTY placeholder
    └── llm-gateway/
        └── connection.json                # EMPTY placeholder
```

> **Note:** The files marked EMPTY are scaffolded (file exists) but have zero content. They need to be authored.

### Build Order
1. **Shared resources** (Data Fabric, Storage Bucket, Trigger, LLM Gateway)
2. **Parallel:** `call-center-ai-agent` + `call-center-followup-case`
3. **`call-center-orchestration`** (depends on Agent)
4. **`call-center-dashboard`** (depends on Agent + Case)
5. **`.uipx` packaging** (`uip solution init` → `pack` → `publish`)

---

## 4. What Has Been Done

### ✅ P1-1 — Data Fabric Entities (COMPLETE)

All Data Fabric entities and choice sets have been **provisioned in staging** via `uip df` CLI.

#### 4.1 Choice Sets Created

| Choice Set | ID | Values |
|---|---|---|
| **YesNoFlag** | `1f70450b-ba6b-f111-8fcb-000d3ab36606` | Yes(0), No(1) |
| **FollowupSource** | `f33a1aa0-ba6b-f111-8fcb-000d3ab36606` | ai_generated(0), manual(1) |
| **FollowupStatus** | `64a137b2-ba6b-f111-8fcb-000d3ab36606` | pending(0), approved(1), rejected(2), in_progress(3), completed(4) |
| **FollowupPriority** | `7927d8c8-ba6b-f111-8fcb-000d3ab36606` | low(0), medium(1), high(2) |

> **Value numbering:** `NumberId` starts at `0`, NOT `1`. This was confirmed by reading back created choice sets via CLI.

#### 4.2 Entities Created

| Entity | ID | Fields | System `Id` of first record |
|---|---|---|---|
| **CallRecord** | `beac40ee-bd6b-f111-8fcb-000d3ab36606` | **43** (27 original + 15 JSON + 1 agent_id + 5 system) | `0fa6a931-dfd6-4726-948b-5fbab681bbcd` |
| **CallFollowup** | `993c2c06-be6b-f111-8fcb-000d3ab36606` | 18 (13 user + 5 system) | — |
| **AiUsage** | `45af032d-bb6b-f111-8fcb-000d3ab36606` | 13 (8 user + 5 system) | — |

#### 4.3 Key Schema Changes from Original Design

| Original Plan | What Was Actually Done | Reason |
|---|---|---|
| `call_id` as `BIG_INTEGER` | `callid` as `STRING(20)` | CLI `--file` silently fails to read values for fields named with underscore prefix (`call_id`). `callid` works. |
| `call_sentiment` as required `INTEGER` | `call_sentiment` as **optional** `INTEGER` | Same `--file` bug: INTEGER values are silently ignored entirely when inserted via `--file`. Required INTEGER fields cause validation failures. |
| `call_id` used in `CallFollowup` | `callid` (STRING) used in `CallFollowup` | Consistency with CallRecord's renamed field. |
| `RELATIONSHIP` field on `call_record` | Kept `RELATIONSHIP` but also kept `callid` STRING | The `RELATIONSHIP` field provides native Data Fabric join. The `callid` STRING preserves the telephony correlation ID for external lookups. |

#### 4.4 Field Definitions

**CallRecord** (43 user-defined fields):

*Original 27 fields:*
1. `callid` — STRING(20), required, unique
2. `call_date` — DATE ← `call_metadata.Call_Date` (populated)
3. `call_start_time` — DATETIME ← `call_metadata.Call_Start_Time` (populated)
4. `call_end_time` — DATETIME ← `call_metadata.Call_End_Time` (populated)
5. `caller_name` — STRING(50) ← `call_metadata.Caller_Name` (populated)
6. `caller_nric` — STRING(15)
7. `caller_dob` — DATE
8. `caller_number` — STRING(15) ← `call_metadata.Caller_Number` (populated)
9. `agent_name` — STRING(30) ← `call_metadata.Agent_Name` (populated)
10. `agent_id` — STRING(10) ← `call_metadata.Agent_Id` (populated)
11. `policy_number` — STRING(25)
12. `call_sentiment` — INTEGER (optional, values: -1, 0, 1)
13. `call_intent1` — STRING(100)
14. `call_intent2` — STRING(100)
15. `call_intent3` — STRING(100)
16. `followup_item1` — STRING(100)
17. `followup_item2` — STRING(100)
18. `followup_item3` — STRING(100)
19. `escalation_flag` — CHOICE_SET_SINGLE (YesNoFlag)
20. `compliance_flag` — CHOICE_SET_SINGLE (YesNoFlag)
21. `call_resolved_flag` — CHOICE_SET_SINGLE (YesNoFlag)
22. `preverified_flag` — CHOICE_SET_SINGLE (YesNoFlag)
23. `triggerword_flag` — CHOICE_SET_SINGLE (YesNoFlag)
24. `triggerwords` — STRING(100)
25. `call_summary` — MULTILINE_TEXT(10000)
26. `file_name` — STRING(100)
27. `repeatcall_flag` — CHOICE_SET_SINGLE (YesNoFlag)
28. `transcript` — MULTILINE_TEXT(10000)

*New fields added (from friend's JSON output):*
29. `duration_seconds` — DECIMAL ← `duration_sec`
30. `agent_sentiment` — DECIMAL ← `sentiment_avg.agent`
31. `customer_sentiment` — DECIMAL ← `sentiment_avg.customer`
32. `agent_audio_emotion` — STRING(20) ← `audio_emotion.agent`
33. `customer_audio_emotion` — STRING(20) ← `audio_emotion.customer`
34. `agent_talk_pct` — DECIMAL ← `talk_ratio_pct.AGENT`
35. `customer_talk_pct` — DECIMAL ← `talk_ratio_pct.CUSTOMER`
36. `fraud_risk` — STRING(20) ← `fraud_risk`
37. `fraud_reason` — MULTILINE_TEXT(2000) ← `fraud_reason`
38. `pii_digits_detected` — CHOICE_SET_SINGLE (YesNoFlag) ← `pii_digits_detected`
39. `is_followup_call` — CHOICE_SET_SINGLE (YesNoFlag) ← `is_followup`
40. `followup_call_evidence` — MULTILINE_TEXT(2000) ← `followup_evidence`
41. `compliance_detail` — MULTILINE_TEXT(10000) ← `compliance` array
42. `compliance_fail_count` — INTEGER ← `compliance_violations.length`
43. `trigger_count` — INTEGER ← `triggers.length`

> **Schema update date:** 2026-06-22 — Added 15 fields + agent_id. `call_metadata` now populates call_date, call_start_time, call_end_time, caller_number, caller_name, agent_name.

**CallFollowup** (13 user-defined fields):
1. `callid` — STRING(20), required
2. `call_record` — RELATIONSHIP (→ CallRecord)
3. `text` — STRING(500), required
4. `reason` — MULTILINE_TEXT(2000)
5. `source` — CHOICE_SET_SINGLE (FollowupSource), required, default `ai_generated` (NumberId=0)
6. `status` — CHOICE_SET_SINGLE (FollowupStatus), required, default `pending` (NumberId=0)
7. `priority` — CHOICE_SET_SINGLE (FollowupPriority)
8. `assigned_to` — STRING(50)
9. `due_date` — DATE
10. `approved_by` — STRING(50)
11. `approved_at` — DATETIME
12. `completed_at` — DATETIME
13. `completion_notes` — MULTILINE_TEXT(2000)

**AiUsage** (8 user-defined fields):
1. `record_key` — STRING(50), required, unique, default `"singleton"`
2. `calls_today` — INTEGER, required, default `0`
3. `total_calls` — INTEGER, required, default `0`
4. `period_date` — DATE
5. `last_reset_at` — DATETIME
6. `last_call_at` — DATETIME
7. `last_model` — STRING(80)
8. `last_endpoint` — STRING(80)

#### 4.5 Test Data Seeded

- **AiUsage singleton:** Re-seeded on 2026-06-22 with `record_key: "singleton"`, `calls_today: 0`, `total_calls: 0`, `period_date: "2026-06-19"`.
- **CallRecord test:** Cleared on 2026-06-22 (all test records deleted to prepare for JSON-based inserts).
- **Cleanup:** 11 test entities created during debugging were deleted earlier.

---

## 5. Critical CLI Bugs & Workarounds Discovered

These were discovered during P1-1 and must be respected by anyone working with Data Fabric via CLI:

| # | Bug | Workaround |
|---|---|---|
| 1 | `uip df choice-sets create` does NOT support `--body` | Use `--display-name` and `--description` flags instead |
| 2 | `uip df choice-set-values create` adds **one value at a time** (`<id> <name> --display-name "..."`) | Cannot pass an array. Must call the command once per value. |
| 3 | `--file` for `records insert/update/import` **silently ignores INTEGER/BIG_INTEGER values** | Use UI or REST API for INTEGER fields. For entity creation, make INTEGER fields optional so `--file` doesn't fail validation. |
| 4 | `--file` for `records insert` **fails on required fields named with underscore prefix** (e.g., `call_id`) | Rename field to avoid underscore prefix (e.g., `callid` instead of `call_id`). |
| 5 | `--body` in PowerShell causes quoting/escaping hell with JSON | Always write JSON to a file with `Set-Content -Path "file.json" -Value '...' -Encoding UTF8`, then use `--file file.json`. |
| 6 | `--body` also silently drops INTEGER values | Same fix: use `--file` instead. |

---

## 6. Task Status

Source: `Docs/acme-call-center-analytics-tasks.xlsx` (updated in both workspace and git repo).

| Phase | Task ID | Subject | Status | Blocked By |
|---|---|---|---|---|
| **1. Infra** | **P1-1** | **Provision Data Fabric entities** | **✅ Done** | — |
| | P1-2 | Provision Storage Bucket `cc-transcripts-incoming` + Time Trigger | ❌ Not Started | — |
| | P1-3 | Provision LLM Gateway connection | ❌ Not Started | — |
| | P1-4 | Register all projects into `.uipx` solution | ❌ Not Started | P1-1, P1-2, P1-3 |
| **2. Flow** | P2-01 | TriggerNewTranscript: storage-bucket trigger | ❌ Not Started | P1-2 |
| | P2-02 | IngestTranscript node | ❌ Not Started | P2-01 |
| | P2-03 | AIParallelFork gateway scaffold (7 branches) | ❌ Not Started | P2-02 |
| | P2-04 | AIParallelJoin gateway | ❌ Not Started | P2-03 |
| | P2-05 | StoreCallRecord node — Data Fabric write | ❌ Not Started | P1-1, P2-04 |
| | P2-06 | SeedFollowups node — Data Fabric write | ❌ Not Started | P2-05 |
| **...** | *(remaining tasks in phases 2–4)* | | ❌ Not Started | various |

### Build Graph
```
T1 Data Fabric ─┬─► T4 AI Agent ─────┬─► T6 Orchestration ─► T9 .uipx
T2 Bucket+Trig  │                     │          ▲
T3 LLM GW       │                     │          │
                └─► T5 Followup ──────┘          │
                                                  │
                                   T7 Dashboard ──┘
```

---

## 7. Key Files in This Repo

| File | Purpose | State |
|---|---|---|
| `Claude.md` (this file) | Living project memory | ✅ Current |
| `Docs/acme-call-center-analytics-solution-sdd.md` | Master SDD | ✅ Complete |
| `Docs/acme-call-center-analytics-tasks.md` | Task plan (markdown) | ✅ Current |
| `Docs/acme-call-center-analytics-tasks.xlsx` | Task plan (Excel) | ✅ Updated (P1-1=Done) |
| `Docs/call-center-transcript-process.bpmn` | Source BPMN (imported to Studio) | ✅ Complete (1199 lines) |
| `Docs/PROJECT_SUMMARY.md` | As-built open-source documentation | ✅ Complete |
| `Docs/call-center-orchestration-sdd.md` | Flow project SDD | ✅ Complete |
| `Docs/call-center-ai-agent-sdd.md` | Agent project SDD | ✅ Complete |
| `Docs/call-center-followup-case-sdd.md` | BPMN project SDD | ✅ Complete |
| `Docs/call-center-dashboard-sdd.md` | Dashboard project SDD | ✅ Complete |
| `Docs/solution-folder-structure.md` | Target folder layout | ✅ Complete |
| `AcmeCallCenterAnalytics/solution.json` | Solution manifest | ✅ Complete |
| `AcmeCallCenterAnalytics/call-center-orchestration/*.flow` | Flow project files | ⚠️ Empty placeholders |
| `AcmeCallCenterAnalytics/call-center-ai-agent/agent.json` | Agent manifest | ⚠️ Empty placeholder |
| `AcmeCallCenterAnalytics/call-center-followup-case/*.bpmn` | BPMN project files | ⚠️ Empty placeholders |
| `AcmeCallCenterAnalytics/call-center-dashboard/src/**/*.ts*` | Dashboard code | ⚠️ Partially scaffolded |
| `AcmeCallCenterAnalytics/shared/**/*.json` | Shared resource definitions | ⚠️ Empty placeholders |

---

## 8. Important Context for Assistants

### 8.1 Working with Data Fabric
- **Entity IDs are stable** — they don't change between sessions.
- **System `Id` field** is a UUID auto-generated per record (not the `callid`).
- **CallRecord system `Id` for test record:** `0fa6a931-dfd6-4726-948b-5fbab681bbcd` — useful for RELATIONSHIP seeding in CallFollowup.
- **Choice set values use `NumberId`** starting at `0`. The `Name` field is the API key (e.g., `"yes"`, `"no"`).
- When inserting records, **always use `--file`**, never `--body` (see §5).

### 8.2 Working with This Repo
- The user has imported `call-center-transcript-process.bpmn` into **UiPath Studio Online** (web) inside a solution.
- All new code should be written into this git repo, then packaged via `uip solution` CLI.
- Do NOT commit secrets. `.env` files and API keys stay local.
- The repo root is `uipath_hackathon26_756/`. The actual solution lives under `uipath_hackathon/AcmeCallCenterAnalytics/`.

### 8.3 Agent Specializations (business domain)
These are hardcoded in the as-built system and must be preserved:
- **Sam** — Claims / Grievances
- **John** — Policy Services
- **David** — Escalations / Quality
- **Mike** — New Business / Renewals
- **Mary** — Billing / Amendments

### 8.4 KPI Benchmarks
From `backend/config.py` (must be preserved in dashboard):
- Target Call Duration: 8 min
- Target AHT (Average Handle Time): 6.5 min
- Target CSAT: 85%
- Target QA Score: 90%
- Target Sentiment Ratio: 75%
- Target Resolution Rate: 80%
- Target Compliance Rate: 100%
- Target QA/Call Ratio: 0.2

---

## 9. Next Logical Steps

The user can pick any of these:

1. **P1-2:** Provision Orchestrator Storage Bucket `cc-transcripts-incoming` + daily ingestion Time Trigger (`uipath-platform` skill)
2. **P1-3:** Provision UiPath LLM Gateway connection (`uipath-platform` skill)
3. **P1-4:** Register all 4 projects into `.uipx` solution (`uipath-solution` skill) — but projects are mostly empty placeholders right now, so this may be premature
4. **Start building projects in parallel:**
   - `call-center-ai-agent` (Coded Agent, Python) — T4
   - `call-center-followup-case` (Maestro BPMN) — T5
   - `call-center-dashboard` (Coded App) — T7 (scaffolded but needs real implementation)
5. **Update the Excel task tracker** as more tasks are completed

---

## 10. BPMN Updates (Local File)

The source BPMN `Docs/call-center-transcript-process.bpmn` has been updated to reflect the UiPath-native architecture:

### First Update (Data Fabric Architecture)

| Task/Gateway | Changes Made |
|---|---|
| **Start_CallReceived** | Updated trigger from "customer call" to "transcript file arrives in Storage Bucket". Added Data Fabric entity IDs. |
| **Task_RecordCall** | Changed from "telephony recording" to "store transcript in Storage Bucket". Added Time Trigger fallback. |
| **Task_IngestTranscript** | Changed from `load_transcripts.py` to Storage Bucket connector. Added Data Fabric query references. |
| **GW_AIParallelFork** | Updated from "UiPath Generative AI" to "Coded Agent tools". Listed all 7 tool names. |
| **GW_AIParallelJoin** | Updated to reflect Data Fabric atomic insert (instead of SQLAlchemy db.commit). |
| **Task_StoreCallRecord** | Completely rewritten: Data Fabric entity ID, `callid` field, choice sets, atomic insert, conflict handling. |
| **Task_SeedFollowups** | Completely rewritten: CallFollowup entity ID, RELATIONSHIP field, choice set values, dedup logic. |
| **Task_UpdateDashboard** | Changed from REST endpoints to Data Fabric `records.query` with aggregates. |
| **7 AI extraction tasks** | Updated from `call_records` PostgreSQL table to `CallRecord` Data Fabric entity. Added tool names. |
| **6 Analytics tasks** | Changed from `GET /api/analytics/...` to Data Fabric `records.query` with groupBy + aggregates. |
| **Task_GenerateAIResponse** | Updated from `ai_service.py` to Coded Agent + LLM Gateway. Added AiUsage entity upsert pattern. |
| **Supervisor lane tasks** | Changed from REST API endpoints (`POST /api/calls/...`) to Data Fabric record updates. |
| **GW_ApproveReject** | Updated state machine to use FollowupStatus NumberIds (0-4). |
| **End_Complete** | Updated system health section to reflect UiPath Cloud stack. |

### Second Update (Friend's JSON Input)

The BPMN was **re-updated** to reflect that the system receives **pre-analyzed JSON** from the user's friend (not raw transcripts):

| Task/Gateway | JSON Mapping Changes |
|---|---|
| **Start_CallReceived** | Renamed to "JSON Analysis Result Arrives". Documents all JSON top-level fields. |
| **Task_RecordCall** | Renamed to "Receive JSON Analysis from Friend's System". Documents JSON fields. |
| **Task_IngestTranscript** | Renamed to "Ingest JSON Analysis Result". Parses JSON (not .txt). |
| **GW_AIParallelFork** | Renamed to "7 Parallel JSON Field Extraction Branches". Branches read from JSON object. |
| **GW_AIParallelJoin** | Updated to "Synchronise: All 7 JSON Branches Complete". |
| **Task_ExtractSentiment** | Maps `sentiment_avg` {agent, customer} + `audio_emotion` → 4 new CallRecord fields. |
| **Task_ClassifyIntents** | Maps single `intent` string → `call_intent1`. Notes JSON only provides 1 intent. |
| **Task_DetectTriggerWords** | Maps `triggers[]` array + `pii_digits_detected` → trigger fields + new PII field. |
| **Task_CheckCompliance** | Maps `compliance[]` (8 rules) + `compliance_violations[]` → compliance_flag + detail fields. |
| **Task_GenFollowups** | Maps `is_followup` + `followup_evidence` → new `is_followup_call` field. Still generates action items. |
| **Task_DetermineResolution** | Maps `resolution` + `fraud_risk` + `fraud_reason` → resolved flag + fraud fields. |
| **Task_GenSummary** | Maps `summary` + `talk_ratio_pct` + `duration_sec` + `recording` → summary + talk ratio + duration fields. |
| **Task_StoreCallRecord** | Updated to 37+ fields including all new JSON-derived fields. |
| **End_Complete** | Lists all JSON-to-Data Fabric field mappings. |

### New CallRecord Fields Added (from JSON)

**Status:** ✅ Added to Data Fabric entity on 2026-06-22 via `uip df entities update`.

| Field | Type | Source JSON Field |
|---|---|---|
| `duration_seconds` | DECIMAL | duration_sec |
| `agent_sentiment` | DECIMAL | sentiment_avg.agent |
| `customer_sentiment` | DECIMAL | sentiment_avg.customer |
| `agent_audio_emotion` | STRING(20) | audio_emotion.agent |
| `customer_audio_emotion` | STRING(20) | audio_emotion.customer |
| `agent_talk_pct` | DECIMAL | talk_ratio_pct.AGENT |
| `customer_talk_pct` | DECIMAL | talk_ratio_pct.CUSTOMER |
| `fraud_risk` | STRING(20) | fraud_risk |
| `fraud_reason` | MULTILINE_TEXT | fraud_reason |
| `pii_digits_detected` | CHOICE_SET_SINGLE | pii_digits_detected |
| `is_followup_call` | CHOICE_SET_SINGLE | is_followup |
| `followup_call_evidence` | MULTILINE_TEXT | followup_evidence |
| `compliance_detail` | MULTILINE_TEXT | full compliance JSON array |
| `compliance_fail_count` | INTEGER | compliance_violations.length |
| `trigger_count` | INTEGER | triggers.length |

> **Note:** These changes are in the **local** `Docs/call-center-transcript-process.bpmn`. The user needs to re-import this file into UiPath Studio Online to see the updated documentation.

---

## 11. Change Log

| Date | Who | What |
|---|---|---|
| 2026-06-18 | uipath-planner | Generated all 5 SDDs + solution.json + task plan |
| 2026-06-19 | OpenCode (kimi-k2.6) | ✅ Completed P1-1: Created 4 choice sets + 3 Data Fabric entities in staging |
| 2026-06-19 | OpenCode (kimi-k2.6) | Discovered CLI bugs (§5), renamed `call_id`→`callid`, updated Excel tracker |
| 2026-06-19 | OpenCode (kimi-k2.6) | Created `Claude.md` and `PROCESS_SPECIFICATION.md` |
| 2026-06-19 | OpenCode (kimi-k2.6) | ✅ Updated BPMN documentation for Data Fabric + Coded Agent architecture |
| 2026-06-19 | OpenCode (kimi-k2.6) | ✅ Re-updated BPMN to reflect friend's JSON input structure (15 new fields mapped) |
| 2026-06-22 | OpenCode (kimi-k2.6) | ✅ Added 15 fields to CallRecord entity via CLI. Cleared all test records. Re-seeded AiUsage singleton. Updated all docs. |
| 2026-06-22 | OpenCode (kimi-k2.6) | ✅ Added `agent_id` field. `call_metadata` now structured JSON (not raw string). Populated call_date, call_start_time, call_end_time, caller_number, caller_name, agent_name from metadata. Inserted Scenario 1 record successfully. |

---

*End of Claude.md — Last updated: 2026-06-19 by OpenCode*
