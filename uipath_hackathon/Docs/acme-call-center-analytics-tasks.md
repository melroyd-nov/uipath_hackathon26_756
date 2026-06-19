# Task Plan — Acme Call Center Analytics 

Derived from `acme-call-center-analytics-solution-sdd.md` (Lane A, uipath-planner). Execution autonomy: **interactive** (per Planner Handoff header) — this plan is presented for review before live tasks are emitted.

## Build Graph

```
T1 Data Fabric entities ─┬─► T4 call-center-ai-agent ─────┬─► T6 call-center-orchestration ─► T9 .uipx package/deploy
T2 Storage Bucket+Trigger┤                                 │            ▲
T3 LLM Gateway connection┘                                 │            │
                                                             ├─► T7 call-center-dashboard ──┘
T5 call-center-followup-case (Maestro BPMN) ────────────────┘
```

## Tasks

| # | Subject | Skill | Blocked by | SDD reference |
|---|---|---|---|---|
| T1 | Provision Data Fabric entities: `CallRecord` (29 fields), `CallFollowup` (16 fields), `AiUsage` (8 fields, singleton-row pattern) | `uipath-data-fabric` | — | `acme-...-solution-sdd.md` §4; `call-center-ai-agent-sdd.md` §9 SME note |
| T2 | Provision Orchestrator Storage Bucket `cc-transcripts-incoming` + daily ingestion Time Trigger | `uipath-platform` | — | `acme-...-solution-sdd.md` §4; `call-center-orchestration-sdd.md` §6 |
| T3 | Provision UiPath LLM Gateway connection for the Coded Agent | `uipath-platform` | — | `acme-...-solution-sdd.md` §4; `call-center-ai-agent-sdd.md` §6 |
| T4 | Build `call-center-ai-agent` — Coded Agent (Python), 14 tools (7 extraction + 6 analytics + `ask`), Simple Function framework | `uipath-agents` | T1, T3 | `call-center-ai-agent-sdd.md` (full) |
| T4-test | Test `call-center-ai-agent`: canonical extraction test case, eval-set scaffold | `uipath-agents` | T4 | `call-center-ai-agent-sdd.md` §10 |
| T5 | Build `call-center-followup-case` — Maestro BPMN process: lanes (Supervisor / Assigned Staff), 4 tasks, gateways, 4 inline HITL forms (business intent only — field schema owned by the HITL authoring step) | `uipath-maestro-bpmn` | T1 | `call-center-followup-case-sdd.md` (full) |
| T5-test | Test `call-center-followup-case`: full approve→assign→track→complete + reject path, guard-rule rejection | `uipath-maestro-bpmn` | T5 | `call-center-followup-case-sdd.md` §10 |
| T6 | Build `call-center-orchestration` — Maestro Flow: ingest → 7-way AI fork/join → persist → seed → fire-and-forget `StartFollowupProcess` → dashboard refresh → 6-way analytics fork/join → Q&A | `uipath-maestro-flow` | T1, T2, T4 | `call-center-orchestration-sdd.md` (full) |
| T6-test | Test `call-center-orchestration`: canonical pipeline run, partial-write/timeout error paths | `uipath-maestro-flow` | T6 | `call-center-orchestration-sdd.md` §10 |
| T7 | Build `call-center-dashboard` — Coded App: 17 routes/pages, 18 chart components, embeds `call-center-followup-case` HITL forms, direct Agent call for AI Insights | `uipath-coded-apps` | T1, T4, T5 | `call-center-dashboard-sdd.md` (full) |
| T7-test | Test `call-center-dashboard`: chart data-shape contracts, full supervisor E2E journey | `uipath-coded-apps` | T7 | `call-center-dashboard-sdd.md` §11 |
| T9 | Package & deploy `.uipx` Solution: `uip solution init` → add all 4 projects → resources refresh → pack → publish/deploy to Cloud Orchestrator `Acme/CallCenterAnalytics` | `uipath-solution` | T4-test, T5-test, T6-test, T7-test | `acme-...-solution-sdd.md` §6 |

## Notes

- `T4` and `T5` have no dependency on each other — they may build in parallel once `T1` (and `T3` for T4) complete.
- `T6` does not need `T5` *built* first — `StartFollowupProcess` only needs the BPMN project to exist by the time the Flow *runs*, not by the time it's built. Listed without a `T6→T5` block edge.
- `[SME REVIEW]` items still open (carried from the SDDs, to be resolved before or during the corresponding build task): historical PostgreSQL data implementation (no task — out of scope per solution overview §1), `AiUsage` Data Fabric upsert pattern (T1/T4), HITL 48h escalation SLA (T5), `LiveCallPage` data source (T7).

## Next Steps

This plan is awaiting interactive review (`EnterPlanMode`). On approval, live `TaskCreate` calls will be emitted for T1–T9 with `addBlockedBy` edges matching the table above, and execution will route to each named specialist skill in turn.
