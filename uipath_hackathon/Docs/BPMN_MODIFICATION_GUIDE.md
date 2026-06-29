# BPMN Modification Guide — Current to New Design

> **Purpose:** Step-by-step instructions for modifying `CurrentBPMNXML.bpmn` (exported from UiPath Studio Web) to implement the JSON validation layer.  
> **Audience:** BPMN modeler working in UiPath Studio Web.  
> **Date:** 2026-06-22  
> **Prerequisite:** Read `JSON_VALIDATION_LAYER_DESIGN.md` for the validation rules and enrichment logic.

---

## 1. Summary of Changes

| Category | Count | Details |
|---|---|---|
| **REMOVE / Update Docs** | 3 elements | Update `<bpmn:documentation>` text only |
| **ADD (New Blocks)** | 1 subprocess + 14 tasks/gateways | Validation + enrichment + routing |
| **UPDATE (Existing)** | 3 elements | Body mapping, rename, rewrite docs |
| **JOIN (Flow Changes)** | 5 sequence flows | Redirect agent output through validation |

---

## 2. REMOVE — Update Documentation Text Only

Do NOT delete these elements. Only update their `<bpmn:documentation>` nodes.

### 2.1 `Start_CallReceived` (Start Event)

**Current documentation says:**
```
TRIGGER: A customer contacts the Acme call centre.
This event starts the full analytics pipeline:
  1. Transcript recording and ingestion
  2. 7-way UiPath Generative AI analysis (parallel)
  3. Data Fabric persistence
  ...
```

**Replace with:**
```
TRIGGER: JSON analysis result arrives from friend's agent system.
This event starts the validation and enrichment pipeline:
  1. Fetch JSON metadata from Google Drive (filename → callid, date, time)
  2. Trigger friend's call-analytics agent
  3. Validate JSON structure, schema, business rules, quality
  4. Enrich data (sentiment categorization, follow-up generation, flag derivation)
  5. Persist validated + enriched record to Data Fabric (43 fields)
  6. Seed CallFollowup rows if action items generated
  7. Route by risk profile (fraud, compliance, escalation, retention)
  8. Supervisor review workflow (if follow-ups exist)
  9. Refresh 8-KPI dashboard + 6 analytics modules
  10. AI Q&A grounded in live Data Fabric data
```

**Keep:** The Google Drive `FILE_CREATED` trigger configuration (lines 89-112). It correctly detects new files.

---

### 2.2 `Task_RecordCall` (Send Task)

**Current documentation says:**
```
WHAT: Telephony system records the call and produces a plain-text transcript file.
FILE NAMING by intent: Claims_Registration_FNOL.txt, Cancellations_Retention.txt, etc.
HEADER FIELDS: Call Date, Call Start/End Time, Caller Name, Caller NRIC, etc.
STORAGE: Files may be bundled as transcripts.zip for batch processing.
```

**Replace with:**
```
WHAT: Fetch JSON metadata from Google Drive folder (Audio_Metadata).
INPUT: File created event from Start_CallReceived (filename from Audio_Inputs).
LOGIC:
  1. Query Audio_Metadata folder for matching .json file
     (filename pattern: {base_name}.json where base_name = audio filename without extension)
  2. Return: file_id, file_name, metadata_file_id
OUTPUT: Variables passed to call-analytics agent (Activity_zzmurL)
NOTE: The friend's agent system produces pre-analyzed JSON. No raw transcript parsing needed.
```

**Keep:** The Google Drive connector configuration (lines 125-147). It correctly fetches metadata.

---

### 2.3 `End_Complete` (End Event)

**Current documentation says:**
```
ALL STEPS COMPLETED:
  Transcript recorded and ingested (load_transcripts.py / generate_summaries.py).
  7 UiPath Generative AI analyses: sentiment, intents x3, trigger words, compliance,
    follow-up items x3, resolution flags x4, call summary.
  call_records row persisted to Data Fabric.
  ...
  Backend: UiPath Maestro Flow + Coded Agent.
  Frontend: UiPath Coded App.
```

**Replace with:**
```
ALL STEPS COMPLETED:
  JSON analysis result received from friend's agent via Google Drive trigger.
  JSON validated: structure (24 rules), schema (22 rules), business rules (14 rules), quality (10 rules).
  Data enriched: sentiment categorized (-1/0/1), flags derived, follow-up action items generated,
    priority assigned, due date calculated, agent assigned by specialization.
  CallRecord persisted to Data Fabric (UiPath) with 43 fields (27 original + 16 JSON-derived).
  CallFollowup rows seeded (if action items generated) with status='pending'.
  AiUsage singleton updated (calls_today, total_calls, last_call_at, last_model, last_endpoint).
  Risk-based routing applied: fraud → compliance queue, unresolved → escalation queue,
    extreme negative sentiment → retention queue, normal → standard flow.
  Supervisor workflow completed (approved/rejected/in_progress/completed) for all pending follow-ups.
  8-KPI dashboard refreshed vs 6 benchmarks.
  6 analytics modules computed (sentiment, escalation, compliance, resolution, intents+marketing, friction+triggers).
  AI Q&A response returned, grounded in live Data Fabric data via Coded Agent + LLM Gateway.
SYSTEM HEALTH:
  Maestro Flow: UiPath Cloud Orchestrator
  Coded Agent: Python agent with Data Fabric tools
  Dashboard: Coded App with Recharts + Tailwind
  Storage: Google Drive (incoming) + Orchestrator Storage Bucket (archive)
READY: System immediately accepts the next incoming JSON analysis result.
```

---

## 3. ADD — New Blocks

### 3.1 Subprocess: `Sub_ValidateAndEnrichJSON`

**Where to insert:** Between `Activity_zzmurL` (call-analytics agent) and `Task_StoreCallRecord`.

**BPMN element:** `<bpmn:subProcess id="Sub_ValidateAndEnrichJSON" name="Validate &amp; Enrich JSON">`

**Lane:** `Lane_System` (Automated System)

**FlowNodeRefs to add to Lane_System:**
```xml
<bpmn:flowNodeRef>Sub_ValidateAndEnrichJSON</bpmn:flowNodeRef>
```

**Incoming flow:** From `Activity_zzmurL` (replace current direct flow to Task_StoreCallRecord)
**Outgoing flow:** To `Task_StoreCallRecord`

**Contents of subprocess (child elements):**

| # | Element ID | Name | Type | Documentation |
|---|---|---|---|---|
| 1 | `Task_ValidateStructure` | Validate JSON Structure | Service Task | Check 24 required fields exist, correct types, non-empty arrays. Hard fail on any missing required field. |
| 2 | `GW_StructureValid` | Structure Valid? | Exclusive Gateway | Yes → Task_ValidateSchema. No → Task_RejectJSON. |
| 3 | `Task_RejectJSON` | Reject &amp; Queue Retry | Service Task | Log error with JSON snippet, alert ops team, move to retry queue. End error path. |
| 4 | `Task_ValidateSchema` | Validate Schema | Service Task | Check enums (resolution, fraud_risk, audio_emotion), ranges (sentiment -1 to 1, talk ratio 0-100), formats (date DD-MM-YYYY), count consistency (trigger_count == triggers.length, compliance_fail_count == violations.length). |
| 5 | `GW_SchemaValid` | Schema Valid? | Exclusive Gateway | Yes → Task_ValidateBusinessRules. No → Task_RejectJSON. Warning → Task_FlagForReview → Task_ValidateBusinessRules. |
| 6 | `Task_FlagForReview` | Flag for Review | Service Task | Set review_flag = true on record metadata. Continue to business rules. |
| 7 | `Task_ValidateBusinessRules` | Validate Business Rules | Service Task | Cross-field consistency: resolved→no escalation, violations→compliance=No, triggers→triggerword=Yes, followup→repeatcall, no_guarantees false positive override, high fraud must have reason. |
| 8 | `GW_BusinessRulesPass` | Business Rules Pass? | Exclusive Gateway | Yes → Task_QualityChecks. No → Task_RejectJSON. Warning → Task_CreateReviewFlag → Task_QualityChecks. |
| 9 | `Task_CreateReviewFlag` | Create Review Flag | Service Task | Set review_flag = true. Continue to quality checks. |
| 10 | `Task_QualityChecks` | Run Quality Checks | Service Task | Outlier detection: duration >30min or <20s, sentiment < -0.8, compliance failures ≥3, triggers ≥5, agent_talk <20%, customer_talk <20%. Also rolling avg checks vs 30-day history. |
| 11 | `GW_QualityFlag` | Quality Flag? | Exclusive Gateway | Normal → Task_EnrichData. Warning → Task_EnrichData (review_flag=true). Critical → Task_SupervisorReview (pre-insert bypass). |
| 12 | `Task_EnrichData` | Enrich Data | Service Task | **Calls Coded Agent.** Generates: sentiment category (-1/0/1), escalation_flag, compliance_flag, triggerword_flag, preverified_flag, followup_item1-3, priority, assigned_to, due_date, triggerwords string, callid, ISO date formats. |

**Subprocess internal sequence flows:**
```
Task_ValidateStructure → GW_StructureValid
  GW_StructureValid (No) → Task_RejectJSON → EndEvent_Error
  GW_StructureValid (Yes) → Task_ValidateSchema → GW_SchemaValid
    GW_SchemaValid (No) → Task_RejectJSON → EndEvent_Error
    GW_SchemaValid (Warning) → Task_FlagForReview → Task_ValidateBusinessRules
    GW_SchemaValid (Yes) → Task_ValidateBusinessRules → GW_BusinessRulesPass
      GW_BusinessRulesPass (No) → Task_RejectJSON → EndEvent_Error
      GW_BusinessRulesPass (Warning) → Task_CreateReviewFlag → Task_QualityChecks
      GW_BusinessRulesPass (Yes) → Task_QualityChecks → GW_QualityFlag
        GW_QualityFlag (Critical) → Task_SupervisorReview → EndEvent_Review
        GW_QualityFlag (Normal/Warning) → Task_EnrichData → EndEvent_Subprocess
```

**End events inside subprocess:**
- `EndEvent_Error` — JSON rejected, logged, retry queued
- `EndEvent_Review` — Critical quality flag, sent to supervisor before insert
- `EndEvent_Subprocess` — Validation passed, enrichment complete, exit to Task_StoreCallRecord

---

### 3.2 Gateway: `GW_RouteByRisk`

**Where to insert:** After `Task_SeedFollowups` and the new `Task_UpdateAiUsage`, before `Task_UpdateDashboard`.

**BPMN element:** `<bpmn:inclusiveGateway id="GW_RouteByRisk" name="Route by Risk Profile">`

**Lane:** `Lane_System`

**FlowNodeRefs to add to Lane_System:**
```xml
<bpmn:flowNodeRef>GW_RouteByRisk</bpmn:flowNodeRef>
<bpmn:flowNodeRef>Task_FraudQueue</bpmn:flowNodeRef>
<bpmn:flowNodeRef>Task_ComplianceQueue</bpmn:flowNodeRef>
<bpmn:flowNodeRef>Task_EscalationQueue</bpmn:flowNodeRef>
<bpmn:flowNodeRef>Task_RetentionQueue</bpmn:flowNodeRef>
```

**Incoming flows:**
- From `GW_HasFollowups` (No path) — calls with no follow-ups
- From `Task_RejectFollowup` — rejected follow-ups
- From `Task_MarkCompleted` — completed follow-ups
- From `Task_TrackProgress` — in-progress follow-ups (via GW_ProgressStatus)

**Outgoing flows (conditional):**

| Flow ID | Condition | Target | Description |
|---|---|---|---|
| `F_Route_Fraud` | `fraud_risk === "high"` | `Task_FraudQueue` | High fraud risk detected |
| `F_Route_Compliance` | `compliance_fail_count >= 3` | `Task_ComplianceQueue` | Multiple compliance failures |
| `F_Route_Escalation` | `resolution === "unresolved"` | `Task_EscalationQueue` | Call unresolved |
| `F_Route_Retention` | `customer_sentiment < -0.8` | `Task_RetentionQueue` | Extremely negative customer |
| `F_Route_Normal` | Default (no conditions above) | `Task_UpdateDashboard` | Normal flow |

**Important:** Inclusive gateway can trigger **multiple** paths. A call can be both high fraud AND unresolved → routes to both Fraud Queue and Escalation Queue.

---

### 3.3 Routing Task Nodes

Add these 4 service tasks after `GW_RouteByRisk`:

#### `Task_FraudQueue`
```xml
<bpmn:serviceTask id="Task_FraudQueue" name="Send to Fraud Queue">
  <bpmn:documentation>
    CONDITION: fraud_risk === "high"
    ACTIONS:
      1. Insert CallRecord (already done)
      2. Create high-priority CallFollowup: "Review fraud risk assessment"
      3. Notify compliance team via email/Teams
      4. Set CallFollowup.priority = 'high' (NumberId=2)
      5. Set CallFollowup.assigned_to = "David" (Escalations/Quality)
    NEXT: Task_UpdateDashboard
  </bpmn:documentation>
  <bpmn:incoming>F_Route_Fraud</bpmn:incoming>
  <bpmn:outgoing>F_FraudQueue_Dashboard</bpmn:outgoing>
</bpmn:serviceTask>
```

#### `Task_ComplianceQueue`
```xml
<bpmn:serviceTask id="Task_ComplianceQueue" name="Send to Compliance Queue">
  <bpmn:documentation>
    CONDITION: compliance_fail_count >= 3
    ACTIONS:
      1. Insert CallRecord (already done)
      2. Create mandatory CallFollowup: "Mandatory compliance retraining required"
      3. Schedule agent retraining session
      4. Set CallFollowup.priority = 'high' (NumberId=2)
      5. Set CallFollowup.assigned_to = agent_name + manager
    NEXT: Task_UpdateDashboard
  </bpmn:documentation>
  <bpmn:incoming>F_Route_Compliance</bpmn:incoming>
  <bpmn:outgoing>F_ComplianceQueue_Dashboard</bpmn:outgoing>
</bpmn:serviceTask>
```

#### `Task_EscalationQueue`
```xml
<bpmn:serviceTask id="Task_EscalationQueue" name="Send to Escalation Queue">
  <bpmn:documentation>
    CONDITION: resolution === "unresolved"
    ACTIONS:
      1. Insert CallRecord (already done)
      2. Create CallFollowup: "Escalated call — supervisor callback required"
      3. Notify supervisor via dashboard notification
      4. Set CallFollowup.priority = 'medium' (NumberId=1)
      5. Set CallFollowup.assigned_to = "David" (Escalations/Quality)
    NEXT: Task_UpdateDashboard
  </bpmn:documentation>
  <bpmn:incoming>F_Route_Escalation</bpmn:incoming>
  <bpmn:outgoing>F_EscalationQueue_Dashboard</bpmn:outgoing>
</bpmn:serviceTask>
```

#### `Task_RetentionQueue`
```xml
<bpmn:serviceTask id="Task_RetentionQueue" name="Send to Retention Queue">
  <bpmn:documentation>
    CONDITION: customer_sentiment < -0.8
    ACTIONS:
      1. Insert CallRecord (already done)
      2. Create CallFollowup: "Urgent customer retention callback"
      3. Notify retention team
      4. Set CallFollowup.priority = 'high' (NumberId=2)
      5. Set CallFollowup.due_date = call_date + 1 day
    NEXT: Task_UpdateDashboard
  </bpmn:documentation>
  <bpmn:incoming>F_Route_Retention</bpmn:incoming>
  <bpmn:outgoing>F_RetentionQueue_Dashboard</bpmn:outgoing>
</bpmn:serviceTask>
```

---

### 3.4 Task: `Task_UpdateAiUsage`

**Where to insert:** Between `Task_SeedFollowups` and `GW_HasFollowups`.

**BPMN element:** `<bpmn:serviceTask id="Task_UpdateAiUsage" name="Update AI Usage Singleton">`

**Lane:** `Lane_System`

**FlowNodeRefs to add to Lane_System:**
```xml
<bpmn:flowNodeRef>Task_UpdateAiUsage</bpmn:flowNodeRef>
```

**Incoming:** From `Task_SeedFollowups`
**Outgoing:** To `GW_HasFollowups`

**Documentation:**
```
FUNCTION: Update AiUsage singleton record
ENTITY: AiUsage (ID: 45af032d-bb6b-f111-8fcb-000d3ab36606)
RECORD: record_key = "singleton" (unique identifier)
OPERATION: Data Fabric UPDATE (not insert — record already seeded)
FIELDS UPDATED:
  calls_today    = calls_today + 1
  total_calls    = total_calls + 1
  last_call_at   = NOW() (UTC)
  last_model     = "friend-call-analytics-agent"
  last_endpoint  = "google-drive-webhook"
PERIOD RESET: If period_date != TODAY, reset calls_today = 1, period_date = TODAY
CLI COMMAND: uip df records update 45af032d-bb6b-f111-8fcb-000d3ab36606 --file "AiUsageUpdate.json"
```

---

## 4. UPDATE — Existing Elements

### 4.1 `Task_StoreCallRecord` — Rewrite Body Mapping

**Current body** (lines 177-179) only maps 3 fields:
```json
{
  "callid": "=js:(vars.response.FullName)",
  "call_date": "=js:((() => { const fullName = vars.response.FullName; ... }))",
  "call_end_time": "=js:(((str) => { const parts = str.split('_'); ... })(vars.response.FullName))"
}
```

**Replace with full 43-field mapping:**

```xml
<uipath:input name="body" type="json" target="body"><![CDATA[{
  "callid": "=js:(vars.report.call_metadata.Caller_Number + '_' + vars.report.call_metadata.Call_Date.replace(/-/g,''))",
  "call_date": "=js:((() => {
    const dateStr = vars.report.call_metadata.Call_Date;
    const parts = dateStr.split('-');
    return parts[2] + '-' + parts[1] + '-' + parts[0];
  })())",
  "call_start_time": "=js:((() => {
    const dt = vars.report.call_metadata.Call_Start_Time;
    const parts = dt.split(' ');
    const d = parts[0].split('-');
    const t = parts[1].split(':');
    return d[2] + '-' + d[1] + '-' + d[0] + 'T' + t[0] + ':' + t[1] + ':' + t[2];
  })())",
  "call_end_time": "=js:((() => {
    const dt = vars.report.call_metadata.Call_End_Time;
    const parts = dt.split(' ');
    const d = parts[0].split('-');
    const t = parts[1].split(':');
    return d[2] + '-' + d[1] + '-' + d[0] + 'T' + t[0] + ':' + t[1] + ':' + t[2];
  })())",
  "caller_name": "=js:(vars.report.call_metadata.Caller_Name)",
  "caller_number": "=js:(String(vars.report.call_metadata.Caller_Number))",
  "agent_name": "=js:(vars.report.call_metadata.Agent_Name)",
  "agent_id": "=js:(String(vars.report.call_metadata.Agent_Id))",
  "call_intent1": "=js:(vars.report.intent)",
  "call_summary": "=js:(vars.report.summary)",
  "transcript": "=js:(vars.report.transcript.join('\\n'))",
  "file_name": "=js:(vars.report.recording)",
  "duration_seconds": "=js:(vars.report.duration_sec)",
  "agent_sentiment": "=js:(vars.report.sentiment_avg.agent)",
  "customer_sentiment": "=js:(vars.report.sentiment_avg.customer)",
  "agent_audio_emotion": "=js:(vars.report.audio_emotion.agent)",
  "customer_audio_emotion": "=js:(vars.report.audio_emotion.customer)",
  "agent_talk_pct": "=js:(vars.report.talk_ratio_pct.AGENT)",
  "customer_talk_pct": "=js:(vars.report.talk_ratio_pct.CUSTOMER)",
  "fraud_risk": "=js:(vars.report.fraud_risk)",
  "fraud_reason": "=js:(vars.report.fraud_reason)",
  "pii_digits_detected": "=js:(vars.report.pii_digits_detected ? 0 : 1)",
  "is_followup_call": "=js:(vars.report.is_followup ? 0 : 1)",
  "followup_call_evidence": "=js:(vars.report.followup_evidence)",
  "compliance_detail": "=js:(JSON.stringify(vars.report.compliance))",
  "compliance_fail_count": "=js:(vars.report.compliance_violations.length)",
  "trigger_count": "=js:(vars.report.triggers.length)",
  "triggerwords": "=js:(vars.report.triggers.map(t => t.word).join(', '))",
  "call_sentiment": "=js:((() => {
    const avg = (vars.report.sentiment_avg.agent + vars.report.sentiment_avg.customer) / 2;
    if (avg > 0.2) return 1;
    if (avg < -0.2) return -1;
    return 0;
  })())",
  "escalation_flag": "=js:((vars.report.resolution === 'unresolved' || vars.report.compliance_violations.length >= 2) ? 0 : 1)",
  "compliance_flag": "=js:(vars.report.compliance_violations.length === 0 ? 0 : 1)",
  "triggerword_flag": "=js:(vars.report.triggers.length > 0 ? 0 : 1)",
  "call_resolved_flag": "=js:(vars.report.resolution === 'resolved' ? 0 : 1)",
  "preverified_flag": "=js:((() => {
    const iv = vars.report.compliance.find(c => c.id === 'identity_verification');
    return (iv && iv.status === 'PASS') ? 0 : 1;
  })())"
}]]></uipath:input>
```

> **Note on choice set values:** `0` = Yes, `1` = No in YesNoFlag choice set.

**Update documentation** (lines 149-162):
```
DATABASE: Data Fabric (UiPath)
ENTITY: CallRecord (ID: beac40ee-bd6b-f111-8fcb-000d3ab36606)
OPERATION: CreateEntityRecord (POST /v2/{entityName}/CreateEntityRecord)
FIELDS: 43 user-defined fields (27 original + 16 JSON-derived)
  Core: callid, call_date, call_start/end_time, caller_name, caller_number,
        agent_name, agent_id, call_intent1, call_summary, transcript, file_name
  Audio Analysis: duration_seconds, agent_sentiment, customer_sentiment,
                  agent_audio_emotion, customer_audio_emotion,
                  agent_talk_pct, customer_talk_pct
  Risk: fraud_risk, fraud_reason, pii_digits_detected
  Follow-up: is_followup_call, followup_call_evidence
  Compliance: compliance_detail, compliance_fail_count
  Triggers: trigger_count, triggerwords
  Derived Flags: call_sentiment, escalation_flag, compliance_flag,
                 triggerword_flag, call_resolved_flag, preverified_flag
INPUT: vars.report (output from call-analytics agent after validation/enrichment)
CONFLICT HANDLING: Skip if callid already exists (duplicate detection)
```

---

### 4.2 `Task_SeedFollowups` — Rename + Rewrite

**Current:**
- ID: `Task_SeedFollowups`
- Name: `Validate Customer Details` ❌ WRONG NAME
- Documentation: Describes old PostgreSQL followup seeding

**Update to:**
```xml
<bpmn:serviceTask id="Task_SeedFollowups" name="Seed CallFollowup Rows">
  <bpmn:documentation>
    FUNCTION: Generate and insert CallFollowup rows from enriched data
    ENTITY: CallFollowup (ID: 993c2c06-be6b-f111-8fcb-000d3ab36606)
    INPUT: followup_item1, followup_item2, followup_item3 from enrichment step
    LOGIC:
      1. For each non-empty followup_item:
         - Create CallFollowup record
         - call_record RELATIONSHIP → CallRecord.Id (from Task_StoreCallRecord output)
         - text = followup_itemX
         - source = 'ai_generated' (NumberId=0)
         - status = 'pending' (NumberId=0)
         - priority = from enrichment (high=2, medium=1, low=0)
         - assigned_to = from enrichment (agent name by specialization)
         - due_date = from enrichment (calculated based on priority)
      2. If no followup items generated → skip (no rows inserted)
    DEDUP: Check existing CallFollowup rows for same callid + text before insert
    SPECIALIZATION MAP:
      Claims/Grievances → Sam
      Policy Services → John
      Escalations/Quality → David
      New Business/Renewals → Mike
      Billing/Amendments → Mary
  </bpmn:documentation>
  <bpmn:incoming>F_StoreRecord_SeedFollowups</bpmn:incoming>
  <bpmn:outgoing>F_Seed_UpdateAiUsage</bpmn:outgoing>
</bpmn:serviceTask>
```

**Note:** Change outgoing flow from `F_Seed_HasFollowupsGW` to `F_Seed_UpdateAiUsage` (going to new Task_UpdateAiUsage).

---

### 4.3 `Activity_zzmurL` — Verify Input/Output

**Keep as-is.** The agent trigger configuration is correct.

**But ensure:** The output variable `report` is available to the subprocess.

**Current output mapping (lines 374-376):**
```xml
<uipath:output name="Error" type="jsonSchema" source="=Error" var="error" />
<uipath:output name="report" type="jsonSchema" source="=report" var="report" />
<uipath:output name="artifacts" type="jsonSchema" source="=artifacts" var="artifacts" />
```

**Verify:** `vars.report` contains the full JSON output from the friend's agent.

---

## 5. JOIN — Sequence Flow Changes

### 5.1 Current Flow (Simplified)

```
Start_CallReceived 
  → Task_RecordCall 
  → Activity_zzmurL (agent)
  → Task_StoreCallRecord
  → Task_SeedFollowups
  → GW_HasFollowups
    → (Yes) → Supervisor Lane → Task_UpdateDashboard
    → (No) → Task_UpdateDashboard
  → GW_AnalyticsFork → 6 modules → GW_AnalyticsJoin
  → Task_GenerateAIResponse → End_Complete
```

### 5.2 New Flow (Simplified)

```
Start_CallReceived 
  → Task_RecordCall 
  → Activity_zzmurL (agent)
  → Sub_ValidateAndEnrichJSON (NEW)
    → Task_ValidateStructure → GW_StructureValid
      → (No) → Task_RejectJSON → End_Error
      → (Yes) → Task_ValidateSchema → GW_SchemaValid
        → (No) → Task_RejectJSON → End_Error
        → (Warning) → Task_FlagForReview → Task_ValidateBusinessRules
        → (Yes) → Task_ValidateBusinessRules → GW_BusinessRulesPass
          → (No) → Task_RejectJSON → End_Error
          → (Warning) → Task_CreateReviewFlag → Task_QualityChecks
          → (Yes) → Task_QualityChecks → GW_QualityFlag
            → (Critical) → Task_SupervisorReview → End_Review
            → (Normal/Warning) → Task_EnrichData → [exit subprocess]
  → Task_StoreCallRecord (43-field body)
  → Task_SeedFollowups (renamed, enriched data)
  → Task_UpdateAiUsage (NEW)
  → GW_HasFollowups
    → (Yes) → Supervisor Lane
    → (No) → GW_RouteByRisk (NEW)
      → (Fraud) → Task_FraudQueue → Task_UpdateDashboard
      → (Compliance) → Task_ComplianceQueue → Task_UpdateDashboard
      → (Escalation) → Task_EscalationQueue → Task_UpdateDashboard
      → (Retention) → Task_RetentionQueue → Task_UpdateDashboard
      → (Normal) → Task_UpdateDashboard
  → GW_AnalyticsFork → 6 modules → GW_AnalyticsJoin
  → Task_GenerateAIResponse → End_Complete
```

### 5.3 Specific Flow Changes

| Flow ID | Current | New | Description |
|---|---|---|---|
| `edge_W8YXWu` | Activity_zzmurL → Task_StoreCallRecord | Activity_zzmurL → Sub_ValidateAndEnrichJSON | Route agent output through validation |
| `F_StoreRecord_SeedFollowups` | Task_StoreCallRecord → Task_SeedFollowups | Keep | Unchanged |
| `F_Seed_HasFollowupsGW` | Task_SeedFollowups → GW_HasFollowups | Task_SeedFollowups → Task_UpdateAiUsage | Insert AI usage update |
| `F_Seed_UpdateAiUsage` | — (NEW) | Task_UpdateAiUsage → GW_HasFollowups | New flow |
| `F_HasFollowups_No` | GW_HasFollowups → Task_UpdateDashboard | GW_HasFollowups → GW_RouteByRisk | Route through risk gateway |
| `F_HasFollowups_Yes` | GW_HasFollowups → Task_SupervisorReview | Keep | Unchanged |
| `F_Route_Normal` | — (NEW) | GW_RouteByRisk → Task_UpdateDashboard | Default route |
| `F_Route_Fraud` | — (NEW) | GW_RouteByRisk → Task_FraudQueue | High fraud |
| `F_Route_Compliance` | — (NEW) | GW_RouteByRisk → Task_ComplianceQueue | Multiple compliance failures |
| `F_Route_Escalation` | — (NEW) | GW_RouteByRisk → Task_EscalationQueue | Unresolved call |
| `F_Route_Retention` | — (NEW) | GW_RouteByRisk → Task_RetentionQueue | Extreme negative sentiment |
| `F_FraudQueue_Dashboard` | — (NEW) | Task_FraudQueue → Task_UpdateDashboard | Continue after fraud routing |
| `F_ComplianceQueue_Dashboard` | — (NEW) | Task_ComplianceQueue → Task_UpdateDashboard | Continue after compliance routing |
| `F_EscalationQueue_Dashboard` | — (NEW) | Task_EscalationQueue → Task_UpdateDashboard | Continue after escalation routing |
| `F_RetentionQueue_Dashboard` | — (NEW) | Task_RetentionQueue → Task_UpdateDashboard | Continue after retention routing |

---

## 6. Variable Additions

Add these variables to the `<uipath:variables>` section (after line 18):

```xml
<!-- Validation flags -->
<uipath:variable id="validation_error" name="validation_error" type="string" />
<uipath:variable id="review_flag" name="review_flag" type="boolean" default="false" />
<uipath:variable id="quality_flag" name="quality_flag" type="string" default="normal" />

<!-- Enriched fields -->
<uipath:variable id="enriched_callid" name="enriched_callid" type="string" />
<uipath:variable id="enriched_call_date" name="enriched_call_date" type="string" />
<uipath:variable id="enriched_call_start_time" name="enriched_call_start_time" type="string" />
<uipath:variable id="enriched_call_end_time" name="enriched_call_end_time" type="string" />
<uipath:variable id="enriched_call_sentiment" name="enriched_call_sentiment" type="integer" />
<uipath:variable id="enriched_escalation_flag" name="enriched_escalation_flag" type="integer" />
<uipath:variable id="enriched_compliance_flag" name="enriched_compliance_flag" type="integer" />
<uipath:variable id="enriched_triggerword_flag" name="enriched_triggerword_flag" type="integer" />
<uipath:variable id="enriched_call_resolved_flag" name="enriched_call_resolved_flag" type="integer" />
<uipath:variable id="enriched_preverified_flag" name="enriched_preverified_flag" type="integer" />
<uipath:variable id="enriched_followup_item1" name="enriched_followup_item1" type="string" />
<uipath:variable id="enriched_followup_item2" name="enriched_followup_item2" type="string" />
<uipath:variable id="enriched_followup_item3" name="enriched_followup_item3" type="string" />
<uipath:variable id="enriched_triggerwords" name="enriched_triggerwords" type="string" />
<uipath:variable id="enriched_priority" name="enriched_priority" type="string" />
<uipath:variable id="enriched_assigned_to" name="enriched_assigned_to" type="string" />
<uipath:variable id="enriched_due_date" name="enriched_due_date" type="string" />

<!-- Store output -->
<uipath:variable id="callrecord_id" name="callrecord_id" type="string" />
```

---

## 7. Quick Reference: Element ID Mapping

| Old ID / Concept | New ID | Action |
|---|---|---|
| `Start_CallReceived` | Keep | Update docs only |
| `Task_RecordCall` | Keep | Update docs only |
| `Activity_zzmurL` | Keep | Verify output vars |
| — | `Sub_ValidateAndEnrichJSON` | **ADD** |
| — | `Task_ValidateStructure` | **ADD** |
| — | `GW_StructureValid` | **ADD** |
| — | `Task_RejectJSON` | **ADD** |
| — | `Task_ValidateSchema` | **ADD** |
| — | `GW_SchemaValid` | **ADD** |
| — | `Task_FlagForReview` | **ADD** |
| — | `Task_ValidateBusinessRules` | **ADD** |
| — | `GW_BusinessRulesPass` | **ADD** |
| — | `Task_CreateReviewFlag` | **ADD** |
| — | `Task_QualityChecks` | **ADD** |
| — | `GW_QualityFlag` | **ADD** |
| — | `Task_EnrichData` | **ADD** |
| `Task_StoreCallRecord` | Keep | **UPDATE body** (43 fields) |
| `Task_SeedFollowups` | Keep | **UPDATE name + docs** |
| — | `Task_UpdateAiUsage` | **ADD** |
| `GW_HasFollowups` | Keep | Keep |
| — | `GW_RouteByRisk` | **ADD** |
| — | `Task_FraudQueue` | **ADD** |
| — | `Task_ComplianceQueue` | **ADD** |
| — | `Task_EscalationQueue` | **ADD** |
| — | `Task_RetentionQueue` | **ADD** |
| `Task_UpdateDashboard` | Keep | Keep |
| `GW_AnalyticsFork` | Keep | Keep |
| 6 analytics tasks | Keep | Keep |
| `GW_AnalyticsJoin` | Keep | Keep |
| `Task_GenerateAIResponse` | Keep | Keep |
| `End_Complete` | Keep | Update docs only |

---

## 8. Validation Rules to Implement in Tasks

### 8.1 Task_ValidateStructure (24 Rules)

```
REQUIRED FIELDS (hard fail if missing):
  recording, duration_sec, call_metadata, call_metadata.Call_Date,
  call_metadata.Call_Start_Time, call_metadata.Call_End_Time,
  call_metadata.Caller_Number, call_metadata.Caller_Name,
  call_metadata.Agent_Name, call_metadata.Agent_Id,
  transcript (array), summary, intent,
  sentiment_avg.agent, sentiment_avg.customer,
  audio_emotion.agent, audio_emotion.customer,
  talk_ratio_pct.AGENT, talk_ratio_pct.CUSTOMER,
  compliance (array), compliance_violations (array),
  triggers (array), is_followup (boolean),
  resolution, fraud_risk, fraud_reason, pii_digits_detected (boolean)
```

### 8.2 Task_ValidateSchema (22 Rules)

```
RANGE VALIDATION:
  duration_sec: 10 to 3600
  sentiment_avg.agent: -1.0 to 1.0
  sentiment_avg.customer: -1.0 to 1.0
  talk_ratio_pct.AGENT: 0.0 to 100.0
  talk_ratio_pct.CUSTOMER: 0.0 to 100.0

ENUM VALIDATION:
  resolution: resolved, unresolved, partial
  fraud_risk: low, medium, high
  audio_emotion.agent: positive, neutral, negative
  audio_emotion.customer: positive, neutral, negative

COUNT CONSISTENCY:
  compliance.length == 8
  compliance_fail_count == compliance_violations.length
  trigger_count == triggers.length

FORMAT VALIDATION:
  Call_Date: DD-MM-YYYY
  Call_Start_Time < Call_End_Time
```

### 8.3 Task_ValidateBusinessRules (14 Rules)

```
CROSS-FIELD CONSISTENCY:
  IF resolution == "resolved" THEN escalation_flag SHOULD be false
  IF resolution == "unresolved" THEN escalation_flag SHOULD be true
  IF fraud_risk == "high" THEN resolution SHOULD NOT be "resolved"
  IF compliance_violations.length > 0 THEN compliance_flag MUST be false (No)
  IF triggers.length > 0 THEN triggerword_flag MUST be true (Yes)
  IF is_followup == true THEN repeatcall_flag SHOULD be true
  IF sentiment_avg.customer < -0.7 AND resolution == "resolved" → Flag
  IF duration_sec < 30 AND compliance_fail_count > 0 → Flag
  IF agent_talk_pct > 80 AND resolved == false → Flag
  IF customer_talk_pct > 70 AND escalated == true → Flag
  IF fraud_risk == "high" AND fraud_reason is empty → BLOCK
  IF pii_digits_detected == true AND no PII triggers → Flag

KNOWN FALSE POSITIVE OVERRIDE:
  IF compliance_violation.rule_id == "no_guarantees" 
     AND evidence contains "discount" OR "retention"
     THEN downgrade severity to "low" OR auto-approve as PASS
```

### 8.4 Task_QualityChecks (10 Rules)

```
OUTLIER DETECTION:
  duration_sec > 1800 → "long_call" tag
  duration_sec < 20 → "short_call" tag
  sentiment_avg.customer < -0.8 → "extreme_negative" tag
  sentiment_avg.agent < -0.5 → "agent_coaching" tag
  compliance_fail_count >= 3 → "compliance_queue" tag
  triggers.length >= 5 → "supervisor_review" tag
  talk_ratio_pct.AGENT < 20 → "customer_led" tag
  talk_ratio_pct.CUSTOMER < 20 → "agent_monologue" tag
  Duplicate callid within 24h → HARD FAIL
```

---

## 9. Video Demo Script Notes

For the hackathon video, highlight these BPMN changes:

1. **"From 7 Branches to 1 Subprocess"** — Show the original complex parallel gateway vs the new clean validation subprocess
2. **"Trust but Verify"** — Walk through the 4 validation steps: Structure → Schema → Business Rules → Quality
3. **"The False Positive"** — Show the `no_guarantees` rule flagging a 15% discount, and how the system auto-corrects it
4. **"Smart Routing"** — Follow a high-fraud call through the Fraud Queue to supervisor notification
5. **"Enrichment Magic"** — Show how decimal sentiment becomes -1/0/1, and how follow-up action items are generated

---

*End of BPMN Modification Guide — produced by OpenCode (kimi-k2.6) on 2026-06-22*
