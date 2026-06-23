# Dashboard Data Requirements vs Agent JSON Output

> **Date:** 2026-06-22
> **Purpose:** Cross-reference the dashboard mock data with the friend's agent JSON output to identify data coverage, gaps, and validation rules.

---

## 1. Dashboard Modules & Data Needs

### 1.1 KPI Summary (Headline Cards)

**Mock Data (`mockDashboardData.ts`):**
| Metric | Source | Calculation |
|---|---|---|
| `total_calls` | Aggregate | COUNT(*) all CallRecords |
| `resolution_pct` | Aggregate | COUNT(resolved=Yes) / COUNT(*) * 100 |
| `avg_sentiment` | Aggregate | AVG(call_sentiment) across all calls |
| `escalation_pct` | Aggregate | COUNT(escalated=Yes) / COUNT(*) * 100 |
| `compliance_fail_pct` | Aggregate | COUNT(compliance=No) / COUNT(*) * 100 |
| `pre_verified_pct` | Aggregate | COUNT(preverified=Yes) / COUNT(*) * 100 |
| `trigger_words_pct` | Aggregate | COUNT(triggerword=Yes) / COUNT(*) * 100 |
| `repeat_call_pct` | Aggregate | COUNT(repeat=Yes) / COUNT(*) * 100 |
| `benchmarks` | Static config | Hardcoded targets from `backend/config.py` |

**Agent JSON Coverage:**
- ✅ `resolution` → `call_resolved_flag`
- ✅ `compliance` → `compliance_flag` (derived from `compliance_violations.length > 0`)
- ✅ `escalation` → `escalation_flag` (derived from resolution status + intent)
- ✅ `pre_verified` → `preverified_flag` (derived from transcript analysis)
- ✅ `trigger_words` → `triggerword_flag` + `trigger_count`
- ✅ `repeat_call` → `is_followup_call` + `followup_evidence`
- ✅ `sentiment` → `agent_sentiment` + `customer_sentiment` (avg = (agent+customer)/2)
- ❌ `total_calls` → NOT in JSON (this is an aggregate count, expected)

**Validation Required:**
```json
{
  "resolution": "resolved|unresolved|partial",
  "compliance_violations": [],
  "triggers": [],
  "is_followup": false,
  "sentiment_avg": { "agent": 0.5, "customer": -0.33 }
}
```

---

### 1.2 KPI Trends (Line Charts)

**Mock Data:** Monthly trends with:
- `total_calls`
- `resolution_pct`
- `escalation_pct`
- `compliance_fail_pct`
- `repeat_call_pct`
- `avg_handle_time_min` ← **NEW, not in Data Fabric**

**Agent JSON Coverage:**
- ✅ All boolean flags available per call
- ❌ `avg_handle_time_min` → NOT in JSON. Must derive from `duration_sec / 60`

**Validation:**
- `duration_sec` must be numeric > 0
- `call_metadata.Call_Start_Time` and `Call_End_Time` must be valid datetimes

---

### 1.3 Agent Summary Table

**Mock Data (`mockAgentSummary`):**
| Field | Source |
|---|---|
| `agent` | `agent_name` |
| `call_count` | COUNT per agent |
| `resolution_pct` | AVG(resolved) per agent |
| `escalation_pct` | AVG(escalated) per agent |
| `compliance_fail_pct` | AVG(compliance=No) per agent |
| `avg_sentiment` | AVG(sentiment) per agent |

**Agent JSON Coverage:**
- ✅ `agent_name` from `call_metadata.Agent_Name`
- ✅ All KPI fields computable from individual call records
- ❌ Agent profile data (role, team, experience, manager) → NOT in JSON

**Validation:**
- `call_metadata.Agent_Name` must be non-empty string
- `call_metadata.Agent_Id` must be present (for stable grouping)

---

### 1.4 Calls List / Detail

**API Types (`calls.ts`):**

**CallRecordList (table view):**
| Field | In JSON? | JSON Path |
|---|---|---|
| `call_id` | ✅ | `call_metadata` → generate or use `callid` |
| `call_date` | ✅ | `call_metadata.Call_Date` |
| `agent_name` | ✅ | `call_metadata.Agent_Name` |
| `caller_nric` | ❌ | NOT in JSON (customer didn't provide NRIC in Scenario 1) |
| `call_intent1` | ✅ | `intent` |
| `call_sentiment` | ⚠️ | Derive from `(agent_sentiment + customer_sentiment) / 2` |
| `escalation_flag` | ✅ | Derived from `resolution` + intent |
| `compliance_flag` | ✅ | Derived from `compliance_violations.length === 0` |
| `call_resolved_flag` | ✅ | `resolution` |
| `repeat_call_flag` | ✅ | `is_followup` |
| `duration_seconds` | ✅ | `duration_sec` |

**CallRecordDetail (expanded view):**
| Field | In JSON? | Notes |
|---|---|---|
| `call_start_time` | ✅ | `call_metadata.Call_Start_Time` |
| `call_end_time` | ✅ | `call_metadata.Call_End_Time` |
| `caller_name` | ✅ | `call_metadata.Caller_Name` |
| `caller_dob` | ❌ | NOT in JSON |
| `caller_number` | ✅ | `call_metadata.Caller_Number` |
| `policy_number` | ❌ | NOT in JSON |
| `call_intent2` | ❌ | JSON only provides 1 intent |
| `call_intent3` | ❌ | JSON only provides 1 intent |
| `followup_item1-3` | ⚠️ | Must be generated from AI, not in raw JSON |
| `preverified_flag` | ⚠️ | Derived from transcript analysis |
| `triggerword_flag` | ✅ | Derived from `triggers.length > 0` |
| `trigger_words` | ✅ | `triggers[].word` concatenated |
| `call_summary` | ✅ | `summary` |
| `file_name` | ✅ | `recording` |
| `transcript` | ✅ | `transcript[]` concatenated |

**Missing from JSON (currently empty in Scenario 1):**
- `caller_nric`
- `caller_dob`
- `policy_number`
- `call_intent2`
- `call_intent3`
- `followup_item1-3` (these are AI-generated action items, not in friend's JSON)

---

### 1.5 Sentiment Analytics

**Mock Data (`mockSentimentData.ts`):**
| Field | Source |
|---|---|
| `avg_score` | AVG(call_sentiment) |
| `positive_count` | COUNT(sentiment=1) |
| `neutral_count` | COUNT(sentiment=0) |
| `negative_count` | COUNT(sentiment=-1) |
| `total_calls` | COUNT(*) |
| `agent` | Group by agent |
| `negative_pct` | negative_count / total_calls |

**Agent JSON Coverage:**
- ✅ `sentiment_avg.agent` → agent sentiment
- ✅ `sentiment_avg.customer` → customer sentiment
- ❌ The JSON provides **decimal** sentiment (-1 to 1), but dashboard expects **categorical** (-1, 0, 1)
- ⚠️ Need mapping: `> 0.2` → positive(1), `< -0.2` → negative(-1), else → neutral(0)

**Validation:**
```json
{
  "sentiment_avg": {
    "agent": "number between -1 and 1",
    "customer": "number between -1 and 1"
  }
}
```

---

### 1.6 Intent Analytics (Pareto)

**Mock Data (`mockIntentsData.ts`):**
| Field | Source |
|---|---|
| `intent` | `call_intent1` |
| `count` | COUNT per intent |
| `pct` | count / total |
| `cumulative_pct` | Running total |
| `avg_sentiment` | AVG sentiment per intent |
| `escalation_pct` | AVG escalation per intent |
| `repeat_call_pct` | AVG repeat per intent |

**Agent JSON Coverage:**
- ✅ `intent` → `call_intent1`
- ❌ JSON only provides **1 intent**. Dashboard mock shows multiple intents per call (call_intent2, call_intent3)
- ⚠️ If friend only returns 1 intent, pareto is still computable but less rich

**Validation:**
- `intent` must be non-empty string
- Should validate against known intent vocabulary (Billing, Cancellation, Claims, etc.)

---

### 1.7 Escalation Analytics

**Mock Data (`mockEscalationsData.ts`):**
| Field | Source |
|---|---|
| `escalation_count` | COUNT(escalated=Yes) |
| `escalation_pct` | COUNT(escalated) / total |
| `by_intent` | Group escalations by intent |

**Agent JSON Coverage:**
- ✅ `resolution` field indicates `unresolved` → escalated
- ✅ Intent available for root-cause grouping
- ❌ No explicit `escalated` boolean in JSON; must derive: `resolution === "unresolved"` OR compliance failures

**Validation:**
- `resolution` must be one of: `resolved`, `unresolved`, `partial`

---

### 1.8 Compliance Analytics

**Mock Data (`mockComplianceData.ts`):**
| Field | Source |
|---|---|
| `fail_count` | COUNT(compliance_flag=No) |
| `compliance_fail_pct` | fail_count / total |

**Agent JSON Coverage:**
- ✅ `compliance[]` array with 8 rules
- ✅ `compliance_violations[]` array with failures
- ✅ `compliance_fail_count` = `compliance_violations.length`
- ⚠️ **Critical finding:** The `no_guarantees` rule flagged the 15% discount as FAIL. This is a **false positive** (retention discount ≠ investment return guarantee). Need to validate compliance rules.

**Validation Required:**
```json
{
  "compliance": [
    {
      "id": "purpose_disclosure",
      "status": "PASS|FAIL",
      "evidence": "non-empty string",
      "reason": "non-empty string"
    }
  ],
  "compliance_violations": [
    {
      "rule_id": "must match compliance[].id",
      "severity": "must be low|medium|high"
    }
  ]
}
```

---

### 1.9 Trigger Words Analytics

**Mock Data (`mockTriggerWordData.ts`):**
| Field | Source |
|---|---|
| `word` | Individual trigger word |
| `count` | Occurrences |
| `pct_of_calls` | count / total_calls |

**Agent JSON Coverage:**
- ✅ `triggers[]` array with `{word, count, context}`
- ✅ `trigger_count` = `triggers.length`
- ✅ `triggerword_flag` = `trigger_count > 0`
- ❌ No `pii_digits_detected` in mock data, but present in JSON

**Validation:**
```json
{
  "triggers": [
    {
      "word": "non-empty string",
      "count": "integer >= 1",
      "context": "non-empty string"
    }
  ],
  "pii_digits_detected": "boolean"
}
```

---

### 1.10 Resolution Analytics

**Mock Data (`mockResolutionData.ts`):**
| Field | Source |
|---|---|
| `resolved_count` | COUNT(resolved=Yes) |
| `unresolved_count` | COUNT(resolved=No) |
| `resolution_pct` | resolved / total |
| `repeat_call_trend` | Monthly repeat % |
| `repeat_call_by_agent` | Agent-level repeat % |

**Agent JSON Coverage:**
- ✅ `resolution` → `resolved`, `unresolved`, `partial`
- ✅ `is_followup` → repeat call flag
- ✅ `fraud_risk` + `fraud_reason` → additional resolution context

**Validation:**
- `resolution` must be one of: `resolved`, `unresolved`, `partial`
- `fraud_risk` must be one of: `low`, `medium`, `high`

---

### 1.11 Follow-ups Management

**Mock Data (`mockFollowupsData.ts`):**
| Field | In JSON? | Source |
|---|---|---|
| `text` | ❌ | AI-generated action item |
| `reason` | ❌ | AI-generated context |
| `source` | N/A | Always `ai_generated` |
| `status` | N/A | Default `pending` |
| `priority` | ❌ | Must derive from intent/escalation |
| `assigned_to` | ❌ | Lookup from agent specialization |
| `due_date` | ❌ | Business rule (e.g., +3 days) |
| `call_id` | ✅ | From `call_metadata` |
| `agent_name` | ✅ | `call_metadata.Agent_Name` |
| `call_intent1` | ✅ | `intent` |

**Critical Gap:** The friend's JSON does NOT generate follow-up action items. The dashboard expects:
- Follow-up text (e.g., "Call back customer regarding premium dispute")
- Priority (low/medium/high)
- Assigned agent

**These must be generated by OUR Coded Agent**, not the friend's system.

---

### 1.12 Friction Points

**Mock Data (`mockFrictionData.ts`):**
| Field | Source |
|---|---|
| `intent` | `call_intent1` |
| `negative_pct` | % negative sentiment |
| `escalation_pct` | % escalated |
| `repeat_call_pct` | % repeat |
| `friction_score` | Weighted composite |

**Agent JSON Coverage:**
- ✅ All components available per call
- ⚠️ `friction_score` must be calculated: `(negative_pct * 0.4 + escalation_pct * 0.35 + repeat_call_pct * 0.25)`

---

### 1.13 Marketing Opportunities

**Mock Data (`mockMarketingData.ts`):**
| Field | Source |
|---|---|
| `intent` | `call_intent1` |
| `opportunity_type` | Derived (Upsell/Cross-sell/Referral/Retention) |
| `positive_sentiment_pct` | % positive |
| `conversion_score` | Composite score |

**Agent JSON Coverage:**
- ❌ **NOT in JSON at all.** This is entirely derived analytics.
- Must map intents to opportunity types:
  - `Product Inquiry` → Cross-sell
  - `Policy Renewal` → Retention
  - `Upgrade` → Upsell
  - `Referral` → Referral

---

### 1.14 Agent Detail Page

**Mock Data (`mockAgentsData.ts`):**
| Field | In JSON? | Source |
|---|---|---|
| `full_name` | ✅ | `agent_name` |
| `role` | ❌ | NOT in JSON |
| `team` | ❌ | NOT in JSON |
| `experience_years` | ❌ | NOT in JSON |
| `manager` | ❌ | NOT in JSON |
| `certifications` | ❌ | NOT in JSON |
| `avatar_initials` | ❌ | Generated from name |
| `feedback` | ❌ | NOT in JSON (manual manager input) |
| `kpi.*` | ✅ | Computable from call records |

**Critical Gap:** Agent profiles (role, team, manager, certifications, feedback) are **not in the JSON**. These need a separate `Agent` entity or static config.

---

## 2. Data Coverage Matrix

| Dashboard Module | % Covered by JSON | Missing / Needs Derivation |
|---|---|---|
| KPI Summary | 90% | `total_calls` (aggregate) |
| KPI Trends | 85% | `avg_handle_time_min` (from duration_sec) |
| Agent Summary | 70% | Agent profile metadata |
| Calls List | 85% | `caller_nric`, `caller_dob`, `policy_number`, `followup_items` |
| Sentiment Analytics | 90% | Categorization of decimal sentiment |
| Intent Pareto | 70% | Only 1 intent vs 3 in design |
| Escalation Analytics | 80% | Explicit escalation flag |
| Compliance Analytics | 95% | Rule validation (false positives) |
| Trigger Words | 100% | — |
| Resolution Analytics | 90% | — |
| Follow-ups | 40% | **Action items, priority, assignment** |
| Friction Points | 85% | Composite score calculation |
| Marketing Opportunities | 20% | **Entirely derived, not in JSON** |
| Agent Detail | 50% | **Profile, feedback, certifications** |

---

## 3. JSON Validation Rules (Post-Agent)

After receiving JSON from the friend's agent, validate BEFORE inserting to Data Fabric:

### 3.1 Required Fields (Hard Fail if Missing)
```json
{
  "recording": "string, non-empty",
  "duration_sec": "number > 0",
  "call_metadata": {
    "Call_Date": "DD-MM-YYYY format",
    "Call_Start_Time": "DD-MM-YYYY HH:MM:SS format",
    "Call_End_Time": "DD-MM-YYYY HH:MM:SS format",
    "Caller_Number": "number or string",
    "Caller_Name": "string, non-empty",
    "Agent_Name": "string, non-empty",
    "Agent_Id": "number or string"
  },
  "transcript": "array of strings, non-empty",
  "summary": "string, non-empty",
  "intent": "string, non-empty"
}
```

### 3.2 Enum Validation (Reject Invalid Values)
| Field | Allowed Values |
|---|---|
| `resolution` | `resolved`, `unresolved`, `partial` |
| `fraud_risk` | `low`, `medium`, `high` |
| `intent` | Must match known vocabulary (see §3.5) |
| `audio_emotion.agent` | `positive`, `neutral`, `negative` |
| `audio_emotion.customer` | `positive`, `neutral`, `negative` |

### 3.3 Range Validation
| Field | Range |
|---|---|
| `sentiment_avg.agent` | -1.0 to 1.0 |
| `sentiment_avg.customer` | -1.0 to 1.0 |
| `talk_ratio_pct.AGENT` | 0.0 to 100.0 |
| `talk_ratio_pct.CUSTOMER` | 0.0 to 100.0 |
| `duration_sec` | > 0 |
| `compliance_fail_count` | 0 to 8 (there are 8 rules) |

### 3.4 Cross-Field Consistency
```
IF triggers.length > 0 THEN triggerword_flag MUST be true
IF compliance_violations.length > 0 THEN compliance_flag MUST be false
IF is_followup === true THEN repeatcall_flag SHOULD be true
IF resolution === "resolved" THEN escalation_flag SHOULD be false
agent_talk_pct + customer_talk_pct MUST === 100 (±0.1)
```

### 3.5 Intent Vocabulary
The dashboard expects these intents. Validate and normalize:
- `Billing Dispute` / `Billing Inquiry`
- `Service Cancellation` / `Cancellation`
- `Technical Support` / `Technical Support Failure`
- `Refund Request`
- `Account Access Issue` / `Account Update`
- `Pricing Complaint`
- `Delivery / Shipping Issue`
- `Product Quality Complaint`
- `Incorrect Charge`
- `Wait Time Complaint`
- `Policy Renewal`
- `New Product Interest` / `Product Inquiry`
- `Claims Registration` / `FNOL`
- `Claims Status`
- `Grievances / Complaints`

---

## 4. What Must Be Built (Not in JSON)

### 4.1 Our Coded Agent Must Generate:
1. **Follow-up action items** (`followup_item1-3`) based on intent + resolution
2. **Follow-up priority** (high/medium/low) based on escalation + compliance
3. **Assigned agent** based on intent specialization mapping
4. **Marketing opportunity classification** from intent
5. **Friction score** composite calculation
6. **Sentiment categorization** (-1/0/1) from decimal scores

### 4.2 Static Config Needed:
1. **Agent profiles** (role, team, manager, experience, certifications)
2. **Benchmark targets** (resolution 80%, escalation 10%, etc.)
3. **Intent → Opportunity Type** mapping
4. **Intent → Agent Specialization** mapping

### 4.3 Data Fabric Schema Additions Needed:
1. **Agent entity** (if we want dynamic agent profiles)
2. **MarketingOpportunity** entity (if we want to persist opportunities)
3. **FrictionScore** could be computed on-the-fly

---

## 5. Recommended Next Steps

1. **Add validation layer** in Maestro Flow before Data Fabric insert
2. **Build Coded Agent tools** for follow-up generation and opportunity detection
3. **Create Agent entity** in Data Fabric for profile storage
4. **Update dashboard API** to compute aggregates from Data Fabric (not mock data)
5. **Normalize intent vocabulary** between friend's agent and our dashboard

---

*End of analysis — produced by OpenCode (kimi-k2.6) on 2026-06-22*
