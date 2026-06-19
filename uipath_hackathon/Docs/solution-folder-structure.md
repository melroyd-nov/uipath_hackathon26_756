# Solution Folder Structure — Acme Call Center Analytics

Combined view of the `.uipx` Solution and its four projects, as designed in the five SDDs in this folder. Each project's own SDD (§9/§10 "Project Structure") is the source of truth for that project's tree — this file shows how they nest under one Solution folder for packaging.

```
AcmeCallCenterAnalytics.uipx-solution/
│
├── solution.json                              # uip solution manifest — lists all 3 projects + shared resources
├── README.md
│
├── call-center-orchestration/                 # Maestro Flow — see call-center-orchestration-sdd.md §9
│   ├── project.uiproj
│   ├── entry-points.json                      # TriggerNewTranscript entry point
│   ├── operate.json
│   ├── bindings_v2.json                       # Data Fabric entity bindings, Agent connection, Storage Bucket binding
│   ├── package-descriptor.json
│   └── call-center-orchestration.flow
│
├── call-center-ai-agent/                      # Coded Agent (Python) — see call-center-ai-agent-sdd.md §9
│   ├── agent.json
│   ├── src/
│   │   ├── tools/
│   │   │   ├── extraction.py                  # extract_sentiment, classify_intents, detect_trigger_words,
│   │   │   │                                  #   check_compliance, generate_followups,
│   │   │   │                                  #   determine_resolution_flags, generate_summary
│   │   │   ├── analytics.py                    # sentiment_analytics, escalation_analytics, compliance_analytics,
│   │   │   │                                  #   resolution_analytics, intent_analytics, friction_analytics
│   │   │   └── qa.py                            # ask() + _build_context() equivalent
│   │   ├── prompts/
│   │   │   └── system_prompt.py
│   │   └── data_fabric_client.py                # CallRecord/CallFollowup/AiUsage read/write helpers
│   ├── requirements.txt
│   └── evals/
│       └── extraction_eval_set.json             # [SME REVIEW] — to be populated
│
├── call-center-followup-case/                  # Maestro BPMN — see call-center-followup-case-sdd.md §9
│   ├── project.uiproj
│   ├── entry-points.json                        # StartFollowupProcess entry point
│   ├── operate.json
│   ├── bindings_v2.json                          # CallFollowup / CallRecord Data Fabric bindings
│   ├── package-descriptor.json
│   └── call-center-followup-case.bpmn           # Authored by uipath-maestro-bpmn
│
├── call-center-dashboard/                      # Coded App — see call-center-dashboard-sdd.md §10
│   ├── app.config.json
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx                              # 17 routes
│   │   ├── api/
│   │   │   ├── dataFabricClient.ts
│   │   │   ├── calls.ts
│   │   │   ├── dashboard.ts
│   │   │   ├── agents.ts
│   │   │   ├── analytics.ts
│   │   │   ├── ai.ts                            # calls call-center-ai-agent directly
│   │   │   └── followups.ts
│   │   ├── pages/                               # 17 page components
│   │   ├── components/                          # ai/, call/, cards/, charts/, dashboard/, layout/, shared/
│   │   ├── context/                              # FilterContext, ThemeContext
│   │   ├── hooks/                                # useDateRange, useIsLightTheme
│   │   ├── types/
│   │   └── utils/                                # benchmarks.ts, colors.ts, csvExport.ts, formatters.ts
│   ├── package.json
│   └── tailwind.config.js
│
└── shared/                                       # Provisioned once, referenced by all 3 projects — not a buildable project
    ├── data-fabric/
    │   ├── CallRecord.entity.json                # 29 fields, PK call_id
    │   ├── CallFollowup.entity.json               # 16 fields
    │   └── AiUsage.entity.json                    # 8 fields, single row — [SME REVIEW] upsert pattern
    ├── storage-bucket/
    │   └── cc-transcripts-incoming/               # Orchestrator Storage Bucket, replaces local .txt/transcripts.zip
    ├── triggers/
    │   └── daily-ingestion-trigger.json            # Time Trigger, [DEFAULT] 06:00 org timezone
    └── llm-gateway/
        └── connection.json                         # UiPath LLM Gateway connection used by call-center-ai-agent
```

## Notes

- `call-center-orchestration`, `call-center-ai-agent`, `call-center-followup-case`, and `call-center-dashboard` are the four independently buildable projects (per `acme-call-center-analytics-solution-sdd.md` §3). `shared/` is not a project — it's provisioned once via `uipath-data-fabric` / `uipath-platform` and consumed by the others through bindings/connectors.
- Build order matches the dependency chain in the solution overview §3: `shared/` resources first → `call-center-ai-agent` and `call-center-followup-case` in parallel (both only depend on Data Fabric) → `call-center-orchestration` (depends on the Agent; does not need the case built first, only present when it runs) → `call-center-dashboard` (depends on Data Fabric, the Agent, and the case's HITL forms) → `.uipx` packaging (`uipath-solution`).
- `call-center-orchestration` no longer owns the follow-up approval state machine — it only starts a `call-center-followup-case` instance, fire-and-forget, and does not wait for it to resolve.
- This tree is illustrative of the target layout; exact file names/casing will be finalized by each specialist skill (`uipath-maestro-flow`, `uipath-agents`, `uipath-maestro-bpmn`, `uipath-coded-apps`, `uipath-data-fabric`, `uipath-solution`) at build time.
