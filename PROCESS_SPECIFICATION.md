# Acme Call Center Analytics — Complete Process Specification

> **Document Purpose:** This is the master process specification for the UiPath-native call center analytics system. It describes the end-to-end flow, data model, human interactions, AI processing, and integration points. Use this as the source of truth for implementation, testing, and troubleshooting.
> 
> **Target Audience:** Developers, solution architects, business analysts, and QA engineers.
> **System Status:** Partially implemented (Data Fabric provisioned, BPMN documented, projects scaffolded).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Actors & Roles](#3-actors--roles)
4. [Detailed Process Flow](#4-detailed-process-flow)
5. [Data Model — Data Fabric Entities](#5-data-model--data-fabric-entities)
6. [Choice Sets & Enumerations](#6-choice-sets--enumerations)
7. [Human-in-the-Loop Touchpoints](#7-human-in-the-loop-touchpoints)
8. [AI / Coded Agent Interactions](#8-ai--coded-agent-interactions)
9. [Integration Points](#9-integration-points)
10. [Error Handling & Recovery](#10-error-handling--recovery)
11. [KPIs, Benchmarks & Reporting](#11-kpis-benchmarks--reporting)
12. [Security & Compliance](#12-security--compliance)
13. [Assumptions & Constraints](#13-assumptions--constraints)
14. [Glossary](#14-glossary)

---

## 1. Executive Summary

Acme Insurance operates a contact centre handling 6 call types: Claims (FNOL, Status, Billing), Policy Services, Cancellations/Retention, Billing/Amendments, New Business/Quoting, and Grievances/Complaints.

Every customer call produces a **plain-text transcript file** (`.txt`). This system ingests that file, runs 7 parallel AI analyses, persists structured results to **Data Fabric**, seeds follow-up action items, routes them through a **supervisor approval workflow**, refreshes a live **KPI dashboard**, and provides **natural-language Q&A** over the entire dataset.

**Key Numbers:**
- 3 Data Fabric entities (CallRecord, CallFollowup, AiUsage)
- 4 choice sets (YesNoFlag, FollowupSource, FollowupStatus, FollowupPriority)
- 7 AI extraction tools (parallel)
- 6 analytics aggregation modules (parallel)
- 8 headline KPIs with benchmark comparisons
- 17 dashboard routes/pages
- 5 agents (Sam, John, David, Mike, Mary)

---

## 2. System Architecture Overview

### 2.1 High-Level Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              EXTERNAL SYSTEMS                                │
│  Telephony System ──► .txt transcript file ──► Orchestrator Storage Bucket  │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         CALL-CENTER-ORCHESTRATION                            │
│                         (Maestro Flow — UiPath Cloud)                        │
│                                                                              │
│  [Trigger] File in Storage Bucket  or  Daily Time Trigger (06:00)           │
│       │                                                                      │
│       ▼                                                                      │
│  [Ingest] Read .txt file ──► Parse header + body                           │
│       │                                                                      │
│       ▼                                                                      │
│  [Parallel Fork — 7 branches]                                                │
│   ├─► extract_sentiment      ├─► detect_trigger_words                      │
│   ├─► classify_intents       ├─► check_compliance                          │
│   ├─► generate_followups     ├─► determine_resolution_flags                │
│   └─► generate_summary                                                       │
│       │                                                                      │
│       ▼                                                                      │
│  [Parallel Join] All 7 results ready                                         │
│       │                                                                      │
│       ▼                                                                      │
│  [StoreCallRecord] Atomic insert into Data Fabric CallRecord                │
│       │                                                                      │
│       ▼                                                                      │
│  [SeedFollowups] Insert up to 3 CallFollowup rows (status=pending)          │
│       │                                                                      │
│       ▼                                                                      │
│  [Gateway] Has follow-ups? ──► Yes ──► Start BPMN (fire-and-forget)       │
│                     │                                                        │
│                     └─► No ──► Skip to Dashboard                            │
│       │                                                                      │
│       ▼                                                                      │
│  [UpdateDashboard] Refresh 8 KPIs from Data Fabric aggregates               │
│       │                                                                      │
│       ▼                                                                      │
│  [Parallel Fork — 6 analytics branches]                                      │
│   ├─► Sentiment Analytics    ├─► Resolution Analytics                      │
│   ├─► Escalation Analytics   ├─► Intent Analytics                          │
│   ├─► Compliance Analytics   └─► Friction/Trigger Analytics                │
│       │                                                                      │
│       ▼                                                                      │
│  [Parallel Join] All 6 analytics complete                                    │
│       │                                                                      │
│       ▼                                                                      │
│  [QueryAI] Supervisor asks question (optional)                               │
│       │                                                                      │
│       ▼                                                                      │
│  [GenerateAIResponse] Coded Agent answers using grounded context            │
│       │                                                                      │
│       ▼                                                                      │
│  [End] Process complete                                                      │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      CALL-CENTER-FOLLOWUP-CASE                               │
│                   (Maestro BPMN — Human Approval Workflow)                   │
│                                                                              │
│  [Start] Triggered by Flow (fire-and-forget)                                │
│       │                                                                      │
│       ▼                                                                      │
│  [SupervisorReview] HITL task — review pending items                        │
│       │                                                                      │
│       ▼                                                                      │
│  [Gateway] Approve or Reject?                                               │
│   ├─► Approve ──► [AssignDetails] priority, assigned_to, due_date          │
│   │                     │                                                    │
│   │                     ▼                                                    │
│   │              [TrackProgress] Agent works on item (in_progress)          │
│   │                     │                                                    │
│   │                     ▼                                                    │
│   │              [Gateway] Complete?                                         │
│   │              ├─► Yes ──► [MarkCompleted] + notes                       │
│   │              └─► No  ──► Back to dashboard                              │
│   │                                                                          │
│   └─► Reject  ──► [RejectFollowup] status=rejected (audit trail)           │
│                          │                                                   │
│                          ▼                                                   │
│                   [UpdateDashboard] Refresh KPIs                            │
└─────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        CALL-CENTER-DASHBOARD                                 │
│                     (Coded App — React + TypeScript)                         │
│                                                                              │
│  Reads directly from Data Fabric (no middle tier). 17 routes:               │
│  Dashboard, Call Log, Call Detail, Agents, Sentiment, Escalations,          │
│  Compliance, Resolution, Intents, Trigger Words, Friction, Follow-ups,      │
│  AI Insights, Live Call, Marketing, Login.                                  │
│                                                                              │
│  AI Insights page calls Coded Agent.ask() directly via LLM Gateway.         │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Project Inventory

| # | Project | Product | Status | Depends On |
|---|---|---|---|---|
| 1 | `call-center-orchestration` | Maestro Flow | Scaffolded (empty `.flow`) | Data Fabric, Storage Bucket, Agent |
| 2 | `call-center-ai-agent` | Coded Agent (Python) | Scaffolded (empty files) | Data Fabric, LLM Gateway |
| 3 | `call-center-followup-case` | Maestro BPMN | Scaffolded (empty `.bpmn`) | Data Fabric |
| 4 | `call-center-dashboard` | Coded App | Partially scaffolded (some TS files) | Data Fabric, Agent, BPMN |

### 2.3 Shared Resources

| Resource | Type | Status | Used By |
|---|---|---|---|
| Data Fabric entities | Native entities | ✅ **Provisioned** | All 4 projects |
| Storage Bucket `cc-transcripts-incoming` | Orchestrator asset | ❌ Not provisioned | Orchestration |
| Daily Time Trigger | Orchestrator trigger | ❌ Not provisioned | Orchestration |
| LLM Gateway connection | Platform connection | ❌ Not provisioned | AI Agent |

---

## 3. Actors & Roles

### 3.1 System Actors

| Actor | Role | UiPath Product |
|---|---|---|
| **Telephony System** | Records calls, produces `.txt` transcript files | External (not UiPath) |
| **Orchestrator** | Hosts Storage Bucket, Triggers, Solution deployment | UiPath Orchestrator |
| **Maestro Flow** | Orchestrates the per-call pipeline | Maestro Flow |
| **Coded Agent** | Runs 14 AI tools (7 extraction + 6 analytics + Q&A) | Coded Agent (Python) |
| **Data Fabric** | Stores all structured data (3 entities) | Data Fabric |
| **Maestro BPMN** | Runs the follow-up approval workflow | Maestro BPMN |
| **Coded App** | Dashboard UI for supervisors and analysts | Coded App |

### 3.2 Human Actors

| Role | Responsibilities | UiPath Touchpoint |
|---|---|---|
| **Call Centre Agent** | Handles customer calls, executes approved follow-ups | Named in CallRecord.agent_name |
| **Supervisor** | Reviews AI-generated follow-ups, approves/rejects, assigns priority/owner/due date | HITL tasks in Maestro BPMN + Coded App |
| **Operations Analyst** | Views dashboard KPIs, runs analytics, asks AI questions | Coded App dashboard |
| **IT Admin** | Provisions resources, monitors system health, handles incidents | Orchestrator + Data Fabric |

### 3.3 Agent Specialisations (Business Domain)

These are hardcoded in the system and used by the AI for context:

| Agent Name | Specialisation |
|---|---|
| **Sam** | Claims / Grievances |
| **John** | Policy Services |
| **David** | Escalations / Quality |
| **Mike** | New Business / Renewals |
| **Mary** | Billing / Amendments |

---

## 4. Detailed Process Flow

### Phase 0: Trigger (Event Start)

**Event:** `Transcript File Arrives in Storage Bucket`

**Primary Trigger:** File-created event on Orchestrator Storage Bucket `cc-transcripts-incoming`.
- File format: `.txt` plain text
- File naming: `Claims_Registration_FNOL.txt`, `Cancellations_Retention.txt`, etc.
- File content: Header (metadata) + Body (dialogue)

**Fallback Trigger:** Daily Time Trigger at 06:00 org timezone.
- Processes any files that arrived overnight
- Prevents missed files if event trigger fails

**Header Fields (parsed from file):**
- Call Date
- Call Start Time
- Call End Time
- Caller Name
- Caller NRIC
- Caller DOB
- Caller Phone Number
- Agent Name (must be one of: Sam, John, David, Mike, Mary)
- Policy Number

**Body:** Speaker-labelled dialogue lines (Agent / Customer).

---

### Phase 1: Ingest (Task_IngestTranscript)

**Name:** Ingest Transcript from Storage Bucket

**Inputs:**
- Raw `.txt` file content from Storage Bucket
- File name (for traceability)

**Steps:**
1. Read file from Storage Bucket into String variable
2. Split header from body
3. Parse header key-value pairs into structured metadata object
4. Isolate dialogue lines
5. Validate agent_name against known agents (Sam, John, David, Mike, Mary)
6. Compute call duration: `call_end_time - call_start_time`

**Outputs:**
- `metadata` object: {call_date, call_start_time, call_end_time, caller_name, caller_nric, caller_dob, caller_number, agent_name, policy_number, file_name}
- `dialogue_text`: full transcript body
- `duration`: computed duration in seconds

**Error Handling:**
- Missing header fields → log warning, use defaults where possible
- Invalid agent_name → flag as "Unknown", do not reject
- File read failure → retry once, then alert

---

### Phase 2: AI Parallel Fork (7 Branches)

**Gateway:** `Fan-out: 7 Parallel AI Analysis Tasks`

All 7 branches run simultaneously via Coded Agent tools + LLM Gateway.
Each tool receives: `{metadata, dialogue_text, system_prompt}`.

**Shared System Prompt Context:**
```
You are an expert call centre analytics AI for Acme Insurance.
Agent specialisations:
  Sam = Claims / Grievances
  John = Policy Services
  David = Escalations / Quality
  Mike = New Business / Renewals
  Mary = Billing / Amendments
Business rules:
  compliance_flag='No' means the AGENT failed, not the customer.
  call_sentiment: 1=Positive, 0=Neutral, -1=Negative.
Format responses concisely. Back claims with evidence from the transcript.
```

#### Branch 1: extract_sentiment

**Tool:** `extract_sentiment`
**What:** Determines emotional tone of the call.
**Output:** `call_sentiment` (INTEGER: -1, 0, +1)
- -1 = Negative (frustration, complaint, dissatisfaction)
-  0 = Neutral (transactional, informational)
- +1 = Positive (satisfaction, gratitude, resolved)
**Used By:** Dashboard KPI, sentiment trends, agent ranking, friction scoring.

#### Branch 2: classify_intents

**Tool:** `classify_intents`
**What:** Identifies up to 3 call topics in priority order.
**Output:** `call_intent1`, `call_intent2`, `call_intent3` (STRING 100 each)
**Categories:**
- Claims Registration (FNOL)
- Claims Status and Tracking
- Claims Status Billing
- Policy Info and Coverage Clarity
- Cancellations and Retention
- Billing and Amendments
- New Business and Quoting
- Policy Renewals
- Grievances and Complaints
**Used By:** Intent Pareto, trends, marketing opportunities, friction points, escalation root-cause.

#### Branch 3: detect_trigger_words

**Tool:** `detect_trigger_words`
**What:** Scans for high-risk language indicating legal/regulatory/dissatisfaction risk.
**Keywords:** "cancel", "complaint", "lawyer", "regulator", "MAS", "sue", "unfair", "escalate", "formal complaint", "ombudsman"
**Outputs:**
- `triggerword_flag` (CHOICE_SET_SINGLE → YesNoFlag)
- `triggerwords` (STRING 100, comma-separated e.g. "cancel, complaint")
**Benchmark:** trigger_word_pct ≤ 3%
**Used By:** Dashboard KPI, trigger word counts/trends, escalation root-cause.

#### Branch 4: check_compliance

**Tool:** `check_compliance`
**What:** Checks if agent followed MAS-mandated protocols.
**Checks:**
- Identity verification (NRIC + DOB confirmed before disclosure)
- Required disclosure scripts read
- PDPA notice given
- MAS regulatory scripts completed
- No unauthorised advice given
**Output:** `compliance_flag` (CHOICE_SET_SINGLE → YesNoFlag)
- Yes = Passed all protocols
- No = Agent failed (not the customer)
**Benchmark:** compliance_fail_pct ≤ 5%
**Used By:** Dashboard KPI, compliance by agent/trend.

#### Branch 5: generate_followups

**Tool:** `generate_followups`
**What:** Identifies post-call action items.
**Examples:**
- "Send updated policy documents to customer via email."
- "Process partial claims reimbursement within 5 business days."
- "Escalate premium waiver request to underwriting team."
**Output:** `followup_item1`, `followup_item2`, `followup_item3` (STRING 100 each)
**Downstream:** Seeded into CallFollowup entity with status=pending.
**Used By:** Supervisor review queue, completion rate KPI.

#### Branch 6: determine_resolution_flags

**Tool:** `determine_resolution_flags`
**What:** Sets 4 binary flags.
**Outputs (all CHOICE_SET_SINGLE → YesNoFlag):**
1. `call_resolved_flag` — Was the issue fully resolved during the call?
   - Benchmark: resolution_pct ≥ 80%
2. `escalation_flag` — Was the call escalated to supervisor/specialist?
   - Benchmark: escalation_pct ≤ 10%
3. `preverified_flag` — Was identity pre-verified (e.g. MyInfo/SingPass)?
   - Benchmark: preverified_pct ≥ 80%
4. `repeatcall_flag` — Is this a repeat call about same unresolved issue?
   - Benchmark: repeat_call_pct ≤ 20%

#### Branch 7: generate_summary

**Tool:** `generate_summary`
**What:** Writes a concise 2-4 sentence plain-English summary.
**Example:** "Mrs Lee called about her hospitalisation claim submitted two weeks ago. Agent John confirmed the claim is under review with a 5-day timeline. A follow-up call was scheduled. No escalation required."
**Output:** `call_summary` (MULTILINE_TEXT 10000)
**Used By:** Call detail page, supervisor review panel, follow-up triage.

---

### Phase 3: Parallel Join (Synchronisation)

**Gateway:** `Synchronise: All 7 AI Results Ready`

**Rule:** Wait for ALL 7 branches to complete before advancing.
**Why:** Prevents partial records. All CallRecord fields must be populated in one atomic insert.
**Timeout:** 5 minutes (configurable). If any branch fails, route to error handling.

**Output:** Aggregated result object containing all 27 fields for CallRecord insertion.

---

### Phase 4: Persist Call Record (Task_StoreCallRecord)

**Name:** Persist Call Record to Data Fabric — Atomic Insert

**Entity:** CallRecord
**Entity ID:** `beac40ee-bd6b-f111-8fcb-000d3ab36606`
**Operation:** `records.insert` — single atomic write

**Fields Inserted (27 user-defined):**

| # | Field | Type | Required | Source |
|---|---|---|---|---|
| 1 | `callid` | STRING(20) | ✅ | Header: parsed from file |
| 2 | `call_date` | DATE | — | Header |
| 3 | `call_start_time` | DATETIME | — | Header |
| 4 | `call_end_time` | DATETIME | — | Header |
| 5 | `caller_name` | STRING(50) | — | Header |
| 6 | `caller_nric` | STRING(15) | — | Header |
| 7 | `caller_dob` | DATE | — | Header |
| 8 | `caller_number` | STRING(15) | — | Header |
| 9 | `agent_name` | STRING(30) | — | Header |
| 10 | `policy_number` | STRING(25) | — | Header |
| 11 | `call_sentiment` | INTEGER | — | AI: extract_sentiment (-1/0/1) |
| 12 | `call_intent1` | STRING(100) | — | AI: classify_intents |
| 13 | `call_intent2` | STRING(100) | — | AI: classify_intents |
| 14 | `call_intent3` | STRING(100) | — | AI: classify_intents |
| 15 | `followup_item1` | STRING(100) | — | AI: generate_followups |
| 16 | `followup_item2` | STRING(100) | — | AI: generate_followups |
| 17 | `followup_item3` | STRING(100) | — | AI: generate_followups |
| 18 | `escalation_flag` | CHOICE_SET_SINGLE | — | AI: determine_resolution_flags |
| 19 | `compliance_flag` | CHOICE_SET_SINGLE | — | AI: check_compliance |
| 20 | `call_resolved_flag` | CHOICE_SET_SINGLE | — | AI: determine_resolution_flags |
| 21 | `preverified_flag` | CHOICE_SET_SINGLE | — | AI: determine_resolution_flags |
| 22 | `triggerword_flag` | CHOICE_SET_SINGLE | — | AI: detect_trigger_words |
| 23 | `triggerwords` | STRING(100) | — | AI: detect_trigger_words |
| 24 | `call_summary` | MULTILINE_TEXT | — | AI: generate_summary |
| 25 | `file_name` | STRING(100) | — | Metadata |
| 26 | `repeatcall_flag` | CHOICE_SET_SINGLE | — | AI: determine_resolution_flags |
| 27 | `transcript` | MULTILINE_TEXT | — | Full dialogue text |

**Conflict Handling:**
- `callid` has `isUnique: true`. Duplicate callid inserts are rejected.
- On duplicate: log error, alert ops, do not overwrite existing record.

**Error Handling:**
- Missing required field → validation error, alert
- Data Fabric unavailable → retry 3x with exponential backoff, then dead-letter
- Timeout → mark as incident, do not lose data

---

### Phase 5: Seed Follow-ups (Task_SeedFollowups)

**Name:** Seed AI Follow-ups into Data Fabric CallFollowup

**Entity:** CallFollowup
**Entity ID:** `993c2c06-be6b-f111-8fcb-000d3ab36606`
**Parent:** CallRecord (via RELATIONSHIP field)

**Logic:**
1. Read the just-inserted CallRecord
2. For each non-empty `followup_itemN`:
   a. Query CallFollowup: does an `ai_generated` row already exist for this `callid` + `text`?
   b. If NO → INSERT new row:
      - `callid` = CallRecord.callid (STRING, required)
      - `call_record` = RELATIONSHIP → CallRecord (system Id UUID)
      - `text` = followup_itemN (STRING 500, required)
      - `reason` = keyword-extracted snippet from transcript (MULTILINE_TEXT 2000)
      - `source` = `ai_generated` (FollowupSource NumberId=0)
      - `status` = `pending` (FollowupStatus NumberId=0)
      - `priority`, `assigned_to`, `due_date` = null (set later by supervisor)
   c. If YES but reason is empty → UPDATE reason field only

**Maximum Rows:** 3 per CallRecord (one per followup_item).

**Deduplication:** Unique on `(callid + text + source=ai_generated)`.

**Error Handling:**
- No follow-up items → skip, proceed to gateway
- Data Fabric insert failure → retry 3x, then alert

---

### Phase 6: Has Follow-ups? (Gateway)

**Name:** Were Follow-up Action Items Generated?

**Condition:** At least one of `CallRecord.followup_item1/2/3` is non-null and non-empty.

**YES Path:**
- Start `call-center-followup-case` BPMN process (fire-and-forget)
- The Flow does NOT wait for the BPMN to complete
- Proceed immediately to UpdateDashboard

**NO Path:**
- Skip supervisor workflow
- Proceed directly to UpdateDashboard

**Why:** Prevents empty workflow tasks for purely informational calls with no outstanding commitments.

---

### Phase 7: Update Dashboard (Task_UpdateDashboard)

**Name:** Refresh Analytics Dashboard — 8 KPI Summary

**Data Source:** Data Fabric CallRecord entity
**Method:** `records.query` with aggregates and groupBy

**8 KPIs Computed:**

| KPI | Formula | Benchmark |
|---|---|---|
| total_calls | COUNT(Id) | — |
| avg_sentiment | AVG(call_sentiment) | — |
| escalation_pct | COUNT(escalation_flag=Yes) / COUNT(Id) * 100 | ≤ 10% |
| compliance_fail_pct | COUNT(compliance_flag=No) / COUNT(Id) * 100 | ≤ 5% |
| resolution_pct | COUNT(call_resolved_flag=Yes) / COUNT(Id) * 100 | ≥ 80% |
| preverified_pct | COUNT(preverified_flag=Yes) / COUNT(Id) * 100 | ≥ 80% |
| trigger_word_pct | COUNT(triggerword_flag=Yes) / COUNT(Id) * 100 | ≤ 3% |
| repeat_call_pct | COUNT(repeatcall_flag=Yes) / COUNT(Id) * 100 | ≤ 20% |

**Also Refreshes:**
- KPI trends: GROUP BY YYYY-MM of call_date
- Agent summary: GROUP BY agent_name + all KPIs + avg duration

**RAG Indicators:**
- Red = outside benchmark
- Amber = within 10% of benchmark boundary
- Green = safely within benchmark

---

### Phase 8: Analytics Parallel Fork (6 Branches)

**Gateway:** `Fan-out: 6 Analytics Modules in Parallel`

All 6 branches query Data Fabric CallRecord entity simultaneously.

#### Branch 1: Sentiment Analytics

**Queries:**
- Daily trend: GROUP BY call_date → positive/neutral/negative counts + avg
- Monthly trend: GROUP BY YYYY-MM → monthly avg + breakdown
- Per-agent: GROUP BY agent_name ORDER BY avg_sentiment ASC (worst first)

#### Branch 2: Escalation Analytics

**Queries:**
- By agent: GROUP BY agent_name ORDER BY escalation_pct DESC
- Monthly trend: GROUP BY YYYY-MM
- Root-cause: Query where escalation_flag=Yes, parse triggerwords, count top 10

#### Branch 3: Compliance Analytics

**Queries:**
- By agent: GROUP BY agent_name ORDER BY compliance_fail_pct DESC
- Monthly trend: GROUP BY YYYY-MM

#### Branch 4: Resolution Analytics

**Queries:**
- Overview: total, resolved/unresolved/repeat counts + percentages
- Monthly resolution trend
- Monthly repeat-call trend
- Repeat calls by agent
- Pre-verified monthly trend

#### Branch 5: Intent Analytics

**Queries:**
- Pareto: GROUP BY call_intent1 ORDER BY count DESC + cumulative_pct
- Trend: GROUP BY call_date + call_intent1
- Marketing opportunities: scoring based on intent + sentiment + resolution

#### Branch 6: Friction/Trigger Analytics

**Queries:**
- Friction points: composite score per intent = (negative_pct*40%) + (escalation_pct*35%) + (repeat_call_pct*25%)
- Trigger word counts: parse triggerwords where triggerword_flag=Yes
- Trigger word monthly trend

---

### Phase 9: Analytics Join (Synchronisation)

**Gateway:** `Synchronise: All 6 Analytics Modules Complete`

**Rule:** Wait for all 6 analytics branches.
**Then:** Assemble `_build_context()` payload for AI grounding.

**Context Format Sent to AI:**
```
=== Acme CALL CENTER — LIVE ANALYTICS CONTEXT ===
Data range: [MIN(call_date)] to [MAX(call_date)] | Total calls: [N]
--- OVERALL KPIs --- (8 metrics with benchmark values)
--- TOP CALL INTENTS --- (top 8 by volume)
--- AGENT PERFORMANCE --- (all agents: sentiment, escalation, resolution, compliance, repeat)
--- MONTHLY TREND --- (by YYYY-MM: volume, sentiment, escalation, resolution)
--- TOP TRIGGER WORDS --- (top 10 by frequency)
--- TOP FRICTION POINTS --- (top 5 composite-scored intents)
```

---

### Phase 10: AI Q&A (Optional)

**Task:** Supervisor Submits Question to AI Insights Panel

**Input:** Free-text question from supervisor (or selected from suggested questions).

**Suggested Questions:**
- "Why are customers calling most frequently?"
- "Which agent has the highest escalation rate and why?"
- "Are there automation opportunities based on call patterns?"
- "What are the top drivers of negative sentiment?"
- "Which call intents have the lowest resolution rate?"
- "What compliance issues are most common?"
- "Are there upsell or cross-sell opportunities in recent calls?"
- "What are the top 3 friction points for customers?"
- "How has call volume and sentiment trended month over month?"
- "Which agent needs the most coaching and why?"

**Process:**
1. Coded Agent receives question + `_build_context()` payload
2. Sends to LLM Gateway: `prompt = f"DATA CONTEXT:\n{context}\n\nQUESTION: {question}"`
3. AI generates markdown response with specific numbers from context
4. Response displayed in Coded App AI Insights panel

**AI Usage Tracking:**
- Entity: AiUsage (`45af032d-bb6b-f111-8fcb-000d3ab36606`)
- Pattern: Query `record_key='singleton'`. Update or insert.
- Fields updated:
  - `calls_today`: increment by 1; reset to 1 if `period_date` != today
  - `total_calls`: increment by 1 (never reset)
  - `period_date`: set to today if changed
  - `last_call_at`: UTC now
  - `last_model`: model name used
  - `last_endpoint`: `'ask'`

---

### Phase 11: End

**Event:** `Call Analytics Process Complete`

**System State:**
- CallRecord persisted with all **42 fields** (27 original + 15 JSON-derived)
- CallFollowup rows seeded (if any follow-ups)
- BPMN follow-up process started (if applicable, fire-and-forget)
- Dashboard KPIs refreshed
- Analytics modules computed
- AI Q&A available (if supervisor asked)
- AiUsage counters incremented
- System ready for next transcript file

---

## 5. Data Model — Data Fabric Entities

### 5.1 Entity Summary

| Entity | ID | Purpose | Record Count |
|---|---|---|---|
| **CallRecord** | `beac40ee-bd6b-f111-8fcb-000d3ab36606` | One row per customer call | One per transcript |
| **CallFollowup** | `993c2c06-be6b-f111-8fcb-000d3ab36606` | Action items per call | 0-3 per CallRecord |
| **AiUsage** | `45af032d-bb6b-f111-8fcb-000d3ab36606` | Singleton usage tracker | Exactly 1 |

### 5.2 CallRecord (42 user-defined fields)

**System fields (auto-generated):** `Id` (UUID), `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy`

| # | Field | Type | Required | Length | Default | Description |
|---|---|---|---|---|---|---|
| 1 | `callid` | STRING | ✅ | 20 | — | Telephony correlation ID (unique) |
| 2 | `call_date` | DATE | — | — | — | Date of the call |
| 3 | `call_start_time` | DATETIME | — | — | — | Call start timestamp |
| 4 | `call_end_time` | DATETIME | — | — | — | Call end timestamp |
| 5 | `caller_name` | STRING | — | 50 | — | Customer name |
| 6 | `caller_nric` | STRING | — | 15 | — | Customer NRIC |
| 7 | `caller_dob` | DATE | — | — | — | Customer date of birth |
| 8 | `caller_number` | STRING | — | 15 | — | Customer phone |
| 9 | `agent_name` | STRING | — | 30 | — | Agent who handled call |
| 10 | `policy_number` | STRING | — | 25 | — | Insurance policy number |
| 11 | `call_sentiment` | INTEGER | — | — | — | -1=Negative, 0=Neutral, 1=Positive |
| 12 | `call_intent1` | STRING | — | 100 | — | Primary intent |
| 13 | `call_intent2` | STRING | — | 100 | — | Secondary intent |
| 14 | `call_intent3` | STRING | — | 100 | — | Tertiary intent |
| 15 | `followup_item1` | STRING | — | 100 | — | AI-generated action item 1 |
| 16 | `followup_item2` | STRING | — | 100 | — | AI-generated action item 2 |
| 17 | `followup_item3` | STRING | — | 100 | — | AI-generated action item 3 |
| 18 | `escalation_flag` | CHOICE_SET_SINGLE | — | — | — | Was call escalated? |
| 19 | `compliance_flag` | CHOICE_SET_SINGLE | — | — | — | Did agent pass compliance? |
| 20 | `call_resolved_flag` | CHOICE_SET_SINGLE | — | — | — | Was issue resolved? |
| 21 | `preverified_flag` | CHOICE_SET_SINGLE | — | — | — | Was caller pre-verified? |
| 22 | `triggerword_flag` | CHOICE_SET_SINGLE | — | — | — | Any trigger words detected? |
| 23 | `triggerwords` | STRING | — | 100 | — | Comma-separated trigger words |
| 24 | `call_summary` | MULTILINE_TEXT | — | 10000 | — | Plain-English summary |
| 25 | `file_name` | STRING | — | 100 | — | Source transcript filename |
| 26 | `repeatcall_flag` | CHOICE_SET_SINGLE | — | — | — | Is this a repeat call? |
| 27 | `transcript` | MULTILINE_TEXT | — | 10000 | — | Full dialogue text |
| 28 | `duration_seconds` | DECIMAL | — | — | — | Call duration in seconds |
| 29 | `agent_sentiment` | DECIMAL | — | — | — | Agent sentiment score |
| 30 | `customer_sentiment` | DECIMAL | — | — | — | Customer sentiment score |
| 31 | `agent_audio_emotion` | STRING | — | 20 | — | Agent audio emotion |
| 32 | `customer_audio_emotion` | STRING | — | 20 | — | Customer audio emotion |
| 33 | `agent_talk_pct` | DECIMAL | — | — | — | Agent talk percentage |
| 34 | `customer_talk_pct` | DECIMAL | — | — | — | Customer talk percentage |
| 35 | `fraud_risk` | STRING | — | 20 | — | Fraud risk level |
| 36 | `fraud_reason` | MULTILINE_TEXT | — | 2000 | — | Fraud risk explanation |
| 37 | `pii_digits_detected` | CHOICE_SET_SINGLE | — | — | — | PII digits detected? |
| 38 | `is_followup_call` | CHOICE_SET_SINGLE | — | — | — | Is this a follow-up call? |
| 39 | `followup_call_evidence` | MULTILINE_TEXT | — | 2000 | — | Evidence for follow-up classification |
| 40 | `compliance_detail` | MULTILINE_TEXT | — | 10000 | — | Full compliance audit JSON |
| 41 | `compliance_fail_count` | INTEGER | — | — | — | Number of compliance failures |
| 42 | `trigger_count` | INTEGER | — | — | — | Number of trigger events |

> **Schema updated:** 2026-06-22 — Added 15 fields to support JSON analysis output from friend's agent.

### 5.3 CallFollowup (13 user-defined fields)

**System fields:** `Id`, `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy`

| # | Field | Type | Required | Length | Default | Description |
|---|---|---|---|---|---|---|
| 1 | `callid` | STRING | ✅ | 20 | — | Links to CallRecord.callid |
| 2 | `call_record` | RELATIONSHIP | — | — | — | Native join to CallRecord |
| 3 | `text` | STRING | ✅ | 500 | — | Action item description |
| 4 | `reason` | MULTILINE_TEXT | — | 2000 | — | Why this follow-up exists |
| 5 | `source` | CHOICE_SET_SINGLE | ✅ | — | ai_generated | ai_generated or manual |
| 6 | `status` | CHOICE_SET_SINGLE | ✅ | — | pending | pending/approved/rejected/in_progress/completed |
| 7 | `priority` | CHOICE_SET_SINGLE | — | — | — | low/medium/high |
| 8 | `assigned_to` | STRING | — | 50 | — | Agent assigned to action |
| 9 | `due_date` | DATE | — | — | — | Target completion date |
| 10 | `approved_by` | STRING | — | 50 | — | Supervisor who approved |
| 11 | `approved_at` | DATETIME | — | — | — | Approval timestamp |
| 12 | `completed_at` | DATETIME | — | — | — | Completion timestamp |
| 13 | `completion_notes` | MULTILINE_TEXT | — | 2000 | — | Notes on action taken |

### 5.4 AiUsage (8 user-defined fields)

**System fields:** `Id`, `CreatedAt`, `CreatedBy`, `UpdatedAt`, `UpdatedBy`

| # | Field | Type | Required | Length | Default | Description |
|---|---|---|---|---|---|---|
| 1 | `record_key` | STRING | ✅ | 50 | singleton | Fixed key for singleton pattern |
| 2 | `calls_today` | INTEGER | ✅ | — | 0 | Daily counter (resets with date) |
| 3 | `total_calls` | INTEGER | ✅ | — | 0 | All-time cumulative counter |
| 4 | `period_date` | DATE | — | — | — | Date of last reset |
| 5 | `last_reset_at` | DATETIME | — | — | — | Last counter reset timestamp |
| 6 | `last_call_at` | DATETIME | — | — | — | Last AI request timestamp |
| 7 | `last_model` | STRING | — | 80 | — | Last LLM model used |
| 8 | `last_endpoint` | STRING | — | 80 | — | Last tool/endpoint called |

---

## 6. Choice Sets & Enumerations

### 6.1 YesNoFlag

**ID:** `1f70450b-ba6b-f111-8fcb-000d3ab36606`

| Name | Display Name | NumberId |
|---|---|---|
| yes | Yes | 0 |
| no | No | 1 |

**Used By:** escalation_flag, compliance_flag, call_resolved_flag, preverified_flag, triggerword_flag, repeatcall_flag

### 6.2 FollowupSource

**ID:** `f33a1aa0-ba6b-f111-8fcb-000d3ab36606`

| Name | Display Name | NumberId |
|---|---|---|
| ai_generated | AI Generated | 0 |
| manual | Manual | 1 |

### 6.3 FollowupStatus

**ID:** `64a137b2-ba6b-f111-8fcb-000d3ab36606`

| Name | Display Name | NumberId |
|---|---|---|
| pending | Pending | 0 |
| approved | Approved | 1 |
| rejected | Rejected | 2 |
| in_progress | In Progress | 3 |
| completed | Completed | 4 |

**State Machine:**
```
pending(0) ──► approved(1) ──► in_progress(3) ──► completed(4)
         │
         └─► rejected(2) [terminal]
```

### 6.4 FollowupPriority

**ID:** `7927d8c8-ba6b-f111-8fcb-000d3ab36606`

| Name | Display Name | NumberId |
|---|---|---|
| low | Low | 0 |
| medium | Medium | 1 |
| high | High | 2 |

---

## 7. Human-in-the-Loop Touchpoints

### 7.1 Supervisor Review (Task_SupervisorReview)

**When:** After AI seeds follow-ups (if any exist).
**Where:** Coded App dashboard + Maestro BPMN HITL task.
**What Supervisor Sees:**
- List of pending follow-up items for the call
- Each item: text, reason, source, status, call summary, caller context
- Buttons: Approve / Reject

### 7.2 Approve + Assign (Task_AssignDetails)

**When:** Supervisor clicks "Approve".
**Fields Captured:**
- Priority (low/medium/high)
- Assigned To (agent name)
- Due Date
**System Action:**
- Update CallFollowup: status=approved, approved_by, approved_at=now
- Set priority, assigned_to, due_date

### 7.3 Reject (Task_RejectFollowup)

**When:** Supervisor clicks "Reject".
**System Action:**
- Update CallFollowup: status=rejected, approved_by, approved_at=now
- Item preserved for audit but excluded from completion rate

### 7.4 Agent Progress (Task_TrackProgress)

**When:** Assigned agent starts working on approved follow-up.
**System Action:**
- Update CallFollowup: status=in_progress

### 7.5 Mark Complete (Task_MarkCompleted)

**When:** Agent finishes the action.
**Fields Captured:**
- Completion notes (free text)
**System Action:**
- Update CallFollowup: status=completed, completed_at=now, completion_notes
- Increases completion rate KPI

### 7.6 AI Q&A (Task_QueryAI)

**When:** Supervisor asks a question in AI Insights panel.
**System Action:**
- Coded Agent builds context from Data Fabric
- LLM Gateway generates answer
- AiUsage counters incremented

---

## 8. AI / Coded Agent Interactions

### 8.1 Agent Structure

**Framework:** Simple Function (tool-calling Python functions)
**Model:** UiPath LLM Gateway [DEFAULT] (gemini-2.5-flash-equivalent)
**System Prompt:** See Phase 2

### 8.2 Extraction Tools (7 tools)

| # | Tool | Input | Output | Complexity |
|---|---|---|---|---|
| 1 | extract_sentiment | transcript | INTEGER (-1/0/1) | Single LLM call |
| 2 | classify_intents | transcript | STRING[3] | Single LLM call |
| 3 | detect_trigger_words | transcript | flag + words | Single LLM call |
| 4 | check_compliance | transcript | flag | Single LLM call |
| 5 | generate_followups | transcript | STRING[3] | Single LLM call |
| 6 | determine_resolution_flags | transcript | 4 flags | Single LLM call |
| 7 | generate_summary | transcript | STRING | Single LLM call |

### 8.3 Analytics Tools (6 tools)

| # | Tool | Input | Output | Complexity |
|---|---|---|---|---|
| 1 | sentiment_analytics | Data Fabric query | aggregated JSON | Query + formatting |
| 2 | escalation_analytics | Data Fabric query | aggregated JSON | Query + formatting |
| 3 | compliance_analytics | Data Fabric query | aggregated JSON | Query + formatting |
| 4 | resolution_analytics | Data Fabric query | aggregated JSON | Query + formatting |
| 5 | intent_analytics | Data Fabric query | aggregated JSON | Query + scoring |
| 6 | friction_analytics | Data Fabric query | aggregated JSON | Query + scoring |

### 8.4 Q&A Tool (1 tool)

| Tool | Input | Output | Complexity |
|---|---|---|---|
| ask | question + context | markdown answer | Context build + LLM call |

### 8.5 Context Builder

The `_build_context()` function runs 6 Data Fabric queries:
1. Overall KPIs (8 metrics + benchmarks)
2. Top 8 call intents by volume
3. Per-agent performance (all KPIs)
4. Monthly trends (volume, sentiment, escalation, resolution)
5. Top 10 trigger words
6. Top 5 friction points

**Result:** Plain-text snapshot injected into LLM prompt.

---

## 9. Integration Points

### 9.1 External Systems

| System | Direction | Data | Method |
|---|---|---|---|
| Telephony System | Inbound | `.txt` transcript files | File drop to Storage Bucket |

### 9.2 UiPath Platform Services

| Service | Usage | Project |
|---|---|---|
| Orchestrator | Hosts Storage Bucket, Triggers, Solution | All |
| Data Fabric | Stores CallRecord, CallFollowup, AiUsage | All |
| LLM Gateway | AI model access for Coded Agent | AI Agent |
| Maestro Flow | Orchestration pipeline | Orchestration |
| Maestro BPMN | Follow-up approval workflow | Followup Case |
| Coded App | Dashboard UI | Dashboard |

### 9.3 Data Flows

```
Telephony ──► Storage Bucket ──► Maestro Flow ──► Coded Agent ──► Data Fabric
                                                    │               │
                                                    │               ▼
                                                    │         Maestro BPMN
                                                    │               │
                                                    │               ▼
                                                    └────────► Coded App
```

---

## 10. Error Handling & Recovery

### 10.1 Error Categories

| Category | Cause | Handling |
|---|---|---|
| **File Read Failure** | Storage Bucket unavailable | Retry 3x, alert if persistent |
| **AI Timeout** | LLM Gateway slow/unavailable | Retry 1x, mark as incident |
| **Data Fabric Insert Fail** | Validation error, duplicate | Alert, dead-letter queue |
| **Missing Required Field** | Bad transcript format | Log warning, use defaults |
| **BPMN Start Fail** | Process not deployed | Alert, retry via manual trigger |
| **Dashboard Query Fail** | Data Fabric unavailable | Show cached data, alert |

### 10.2 Retry Policy

| Operation | Retries | Backoff | Dead Letter |
|---|---|---|---|
| Storage Bucket read | 3 | Exponential (1s, 2s, 4s) | Alert ops |
| AI tool call | 1 | Immediate | Mark incomplete |
| Data Fabric insert | 3 | Exponential | Alert + dead-letter |
| Data Fabric query | 2 | 1s | Return cached |

### 10.3 Incident Escalation

1. **Level 1:** Auto-retry with backoff
2. **Level 2:** Log incident, notify monitoring
3. **Level 3:** Alert on-call engineer via notification
4. **Level 4:** Manual intervention required

---

## 11. KPIs, Benchmarks & Reporting

### 11.1 Headline KPIs

| KPI | Target | Direction |
|---|---|---|
| Avg Call Sentiment | — | Higher is better |
| Escalation % | ≤ 10% | Lower is better |
| Compliance Fail % | ≤ 5% | Lower is better |
| Resolution % | ≥ 80% | Higher is better |
| Pre-Verified % | ≥ 80% | Higher is better |
| Trigger Word % | ≤ 3% | Lower is better |
| Repeat Call % | ≤ 20% | Lower is better |
| Total Calls | — | Track volume |

### 11.2 Additional Benchmarks

| Metric | Target |
|---|---|
| Target Call Duration | 8 minutes |
| Target AHT | 6.5 minutes |
| Target CSAT | 85% |
| Target QA Score | 90% |
| Target QA/Call Ratio | 0.2 |

### 11.3 Reporting

- **Real-time:** Dashboard refreshes after every call
- **Daily:** Time Trigger processes overnight batch
- **Monthly:** Trend analytics grouped by YYYY-MM
- **Ad-hoc:** AI Q&A answers any natural-language question

---

## 12. Security & Compliance

### 12.1 Data Protection

- Customer PII (NRIC, DOB, phone) stored in Data Fabric (encrypted at rest)
- Transcript content stored in Data Fabric (access-controlled)
- No secrets in code (API keys via UiPath connections, not env vars)

### 12.2 Access Control

- Supervisors: Full read + follow-up approval/rejection
- Agents: Read own calls + assigned follow-ups only
- Analysts: Read-only dashboard access
- Admins: Full access

### 12.3 MAS Compliance

- Agent compliance checked on every call
- Compliance failures logged and trended
- Persistent failures may trigger MAS regulatory reporting

---

## 13. Assumptions & Constraints

### 13.1 Assumptions

1. Transcript files are well-formed `.txt` with header/body structure
2. Agent names in transcript header match known agents (Sam, John, David, Mike, Mary)
3. Telephony system drops files into Storage Bucket within 1 hour of call end
4. Supervisor reviews follow-ups within 48 hours (recommended SLA)
5. LLM Gateway is available and responsive (p99 < 10s per tool call)

### 13.2 Constraints

1. **Data Fabric CLI Limitations:** INTEGER fields cannot be set via `--file` insert (use UI/REST). Field names with underscore prefix fail (`call_id` → `callid`).
2. **Choice Set Values:** NumberId starts at 0, not 1.
3. **CallFollowup Limit:** Maximum 3 AI-generated items per CallRecord.
4. **BPMN Fire-and-Forget:** Flow does not wait for follow-up workflow completion.
5. **AiUsage Singleton:** Exactly one row with `record_key='singleton'`.

### 13.3 Known Issues

1. `call_sentiment` is optional INTEGER due to CLI insert bug — may need UI/REST update after creation
2. `callid` is STRING(20) not BIGINT due to CLI field naming bug
3. Coded Agent, BPMN, and Flow projects are currently empty placeholders

---

## 14. Glossary

| Term | Definition |
|---|---|
| **AHT** | Average Handle Time — duration from call start to call end |
| **BPMN** | Business Process Model and Notation — visual workflow standard |
| **CHOICE_SET_SINGLE** | Data Fabric field type for single-select dropdown values |
| **CSAT** | Customer Satisfaction Score |
| **Data Fabric** | UiPath's native data platform (entities, records, queries) |
| **FNOL** | First Notice of Loss — initial claims report |
| **HITL** | Human-in-the-Loop — tasks requiring human approval/action |
| **KPI** | Key Performance Indicator |
| **LLM Gateway** | UiPath's managed service for calling large language models |
| **MAS** | Monetary Authority of Singapore — regulatory body |
| **MULTILINE_TEXT** | Data Fabric field type for long text (up to 10,000 chars) |
| **NRIC** | National Registration Identity Card (Singapore) |
| **PDPA** | Personal Data Protection Act |
| **RAG** | Red/Amber/Green — status indicator against benchmarks |
| **RELATIONSHIP** | Data Fabric field type for native entity joins |
| **STRING** | Data Fabric field type for text (with length limit) |
| **Time Trigger** | Orchestrator scheduled trigger (cron-like) |
| **.uipx** | UiPath Solution package format |

---

*Document Version: 1.1*
*Last Updated: 2026-06-22*
*Author: OpenCode (kimi-k2.6)*
*Status: Draft — CallRecord schema updated with 15 JSON-derived fields (now 42 total)*
