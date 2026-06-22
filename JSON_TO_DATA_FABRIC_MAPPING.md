# JSON-to-Data-Fabric Mapping Guide

> Use this to insert your agent's JSON output into the Data Fabric entities.
> 
> **Status:** CallRecord entity updated on 2026-06-22 with 15 new fields. All 42 fields are now provisioned in Data Fabric.

---

## 1. Entity-to-JSON Mapping Tables

### CallRecord Entity (`beac40ee-bd6b-f111-8fcb-000d3ab36606`)

**Total fields:** 42 user-defined + 5 system = 47 total

| # | Entity Field | Type | Required | JSON Field | Example Value | Notes |
|---|---|---|---|---|---|---|
| 1 | `callid` | STRING(20) | ✅ | Auto-generate | `"S1_CALL_001"` | Unique per call |
| 2 | `call_date` | DATE | — | Not in JSON | `null` | Leave empty |
| 3 | `call_start_time` | DATETIME | — | Not in JSON | `null` | Leave empty |
| 4 | `call_end_time` | DATETIME | — | Not in JSON | `null` | Leave empty |
| 5 | `caller_name` | STRING(50) | — | `transcript` (extract) | `"David Chen"` | From customer utterance |
| 6 | `caller_nric` | STRING(15) | — | `transcript` (extract) | `"S1234567D"` | From customer utterance |
| 7 | `caller_dob` | DATE | — | `transcript` (extract) | `"1985-01-05"` | Parse from transcript |
| 8 | `caller_number` | STRING(15) | — | Not in JSON | `null` | Leave empty |
| 9 | `agent_name` | STRING(30) | — | `transcript` (extract) | `"Mike"` | From agent intro |
| 10 | `policy_number` | STRING(25) | — | Not in JSON | `null` | Leave empty |
| 11 | `call_sentiment` | INTEGER | — | `sentiment_avg` | Skip | INTEGER fails with `--file` |
| 12 | `call_intent1` | STRING(100) | — | `intent` | `"Cancellations"` | Direct mapping |
| 13 | `call_intent2` | STRING(100) | — | Not in JSON | `null` | Leave empty |
| 14 | `call_intent3` | STRING(100) | — | Not in JSON | `null` | Leave empty |
| 15 | `followup_item1` | STRING(100) | — | Inferred from `transcript` | `"Email updated policy docs"` | Agent commitment |
| 16 | `followup_item2` | STRING(100) | — | Not in JSON | `null` | Leave empty |
| 17 | `followup_item3` | STRING(100) | — | Not in JSON | `null` | Leave empty |
| 18 | `escalation_flag` | CHOICE_SET_SINGLE | — | Not in JSON | `1` (No) | Default to No |
| 19 | `compliance_flag` | CHOICE_SET_SINGLE | — | `compliance_violations` | `1` (No) | No if violations>0 |
| 20 | `call_resolved_flag` | CHOICE_SET_SINGLE | — | `resolution` | `0` (Yes) | Yes if "resolved" |
| 21 | `preverified_flag` | CHOICE_SET_SINGLE | — | Not in JSON | `1` (No) | Default to No |
| 22 | `triggerword_flag` | CHOICE_SET_SINGLE | — | `triggers` | `1` (No) | No if empty array |
| 23 | `triggerwords` | STRING(100) | — | `triggers[]` | `""` | Empty if no triggers |
| 24 | `call_summary` | MULTILINE_TEXT | — | `summary` | `"The caller initially wanted..."` | Direct mapping |
| 25 | `file_name` | STRING(100) | — | `recording` | `"ElevenLabs_Untitled_project-S1.mp3"` | Direct mapping |
| 26 | `repeatcall_flag` | CHOICE_SET_SINGLE | — | `is_followup` | `1` (No) | No if false |
| 27 | `transcript` | MULTILINE_TEXT | — | `transcript[]` | Full text | Concatenate array |
| 28 | `duration_seconds` | DECIMAL | — | `duration_sec` | `65.9` | ✅ Added 2026-06-22 |
| 29 | `agent_sentiment` | DECIMAL | — | `sentiment_avg.agent` | `0.5` | ✅ Added 2026-06-22 |
| 30 | `customer_sentiment` | DECIMAL | — | `sentiment_avg.customer` | `-0.33` | ✅ Added 2026-06-22 |
| 31 | `agent_audio_emotion` | STRING(20) | — | `audio_emotion.agent` | `"neutral"` | ✅ Added 2026-06-22 |
| 32 | `customer_audio_emotion` | STRING(20) | — | `audio_emotion.customer` | `"neutral"` | ✅ Added 2026-06-22 |
| 33 | `agent_talk_pct` | DECIMAL | — | `talk_ratio_pct.AGENT` | `59.6` | ✅ Added 2026-06-22 |
| 34 | `customer_talk_pct` | DECIMAL | — | `talk_ratio_pct.CUSTOMER` | `40.4` | ✅ Added 2026-06-22 |
| 35 | `fraud_risk` | STRING(20) | — | `fraud_risk` | `"low"` | ✅ Added 2026-06-22 |
| 36 | `fraud_reason` | MULTILINE_TEXT | — | `fraud_reason` | `"The caller accepted..."` | ✅ Added 2026-06-22 |
| 37 | `pii_digits_detected` | CHOICE_SET_SINGLE | — | `pii_digits_detected` | `0` (Yes) | ✅ Added 2026-06-22 |
| 38 | `is_followup_call` | CHOICE_SET_SINGLE | — | `is_followup` | `1` (No) | ✅ Added 2026-06-22 |
| 39 | `followup_call_evidence` | MULTILINE_TEXT | — | `followup_evidence` | `"None of the cues..."` | ✅ Added 2026-06-22 |
| 40 | `compliance_detail` | MULTILINE_TEXT | — | `compliance` array | Full JSON text | ✅ Added 2026-06-22 |
| 41 | `compliance_fail_count` | INTEGER | — | `compliance_violations.length` | `2` | ✅ Added 2026-06-22 |
| 42 | `trigger_count` | INTEGER | — | `triggers.length` | `0` | ✅ Added 2026-06-22 |
| 43 | `agent_id` | STRING(10) | — | `call_metadata.Agent_Id` | `"1001"` | ✅ Added 2026-06-22 |

**Fields populated from `call_metadata` (structured JSON):**

| # | Entity Field | Type | JSON Field | Format Conversion |
|---|---|---|---|---|
| 2 | `call_date` | DATE | `call_metadata.Call_Date` | `DD-MM-YYYY` → `YYYY-MM-DD` |
| 3 | `call_start_time` | DATETIME | `call_metadata.Call_Start_Time` | `DD-MM-YYYY HH:MM:SS` → ISO 8601 |
| 4 | `call_end_time` | DATETIME | `call_metadata.Call_End_Time` | `DD-MM-YYYY HH:MM:SS` → ISO 8601 |
| 5 | `caller_name` | STRING(50) | `call_metadata.Caller_Name` | Direct |
| 8 | `caller_number` | STRING(15) | `call_metadata.Caller_Number` | Integer → String |
| 9 | `agent_name` | STRING(30) | `call_metadata.Agent_Name` | Direct |
| 10 | `agent_id` | STRING(10) | `call_metadata.Agent_Id` | Integer → String |

> **Note:** All 43 fields are now provisioned in Data Fabric. The `call_metadata` object is structured JSON (not raw string) as of the latest agent output.

---

### CallFollowup Entity (`993c2c06-be6b-f111-8fcb-000d3ab36606`)

For Scenario 1, **no CallFollowup record is strictly required** because:
- `is_followup` = `false` (this is not a follow-up call)
- No explicit action items in JSON

However, if you want to track the agent's commitment:

| Field | Value | Source |
|---|---|---|
| `callid` | `"S1_CALL_001"` | Same as CallRecord |
| `call_record` | RELATIONSHIP | CallRecord system Id |
| `text` | `"Email updated policy documents to customer"` | Inferred from transcript |
| `reason` | `"Agent committed to emailing updated policy docs after applying 15% discount"` | Inferred |
| `source` | `0` (ai_generated) | Fixed |
| `status` | `0` (pending) | Fixed |

---

### AiUsage Entity (`45af032d-bb6b-f111-8fcb-000d3ab36606`)

| Field | Current Value | New Value | Action |
|---|---|---|---|
| `record_key` | `"singleton"` | `"singleton"` | Keep |
| `calls_today` | `0` | `1` | Increment |
| `total_calls` | `0` | `1` | Increment |
| `period_date` | `"2026-06-19"` | `"2026-06-19"` | Set to today |
| `last_call_at` | `null` | `"2026-06-19T10:00:00"` | Set to now |
| `last_model` | `null` | `"gemini-2.5-flash"` | Set |
| `last_endpoint` | `null` | `"audio_analysis"` | Set |

---

## 2. PowerShell Code to Insert Records

### Step 1: Build CallRecord JSON (Existing Fields Only)

```powershell
Set-Content -Path "CallRecord_S1.json" -Value '{
  "callid": "S1_CALL_001",
  "caller_name": "David Chen",
  "caller_nric": "S1234567D",
  "caller_dob": "1985-01-05",
  "agent_name": "Mike",
  "call_intent1": "Cancellations",
  "call_resolved_flag": 0,
  "compliance_flag": 1,
  "triggerword_flag": 1,
  "file_name": "ElevenLabs_Untitled_project-S1.mp3",
  "call_summary": "The caller initially wanted to cancel their insurance policy due to an increased premium but agreed to keep it after being offered a 15% retention discount.",
  "transcript": "AGENT: Welcome to Acme Insurance Renewals. My name is Mike. How can I help you today? CUSTOMER: Hi. I received my renewal notice, and the premium increased too much. I want to cancel my policy completely. AGENT: I understand you are looking to cancel, and I can process that for you. For data protection, could you please state your full name, N-R-I-C, and date of birth? CUSTOMER: Sure. I am David Chen. My N-R-I-C is S-1-2-3-4-5-6-7-D, and my date of birth is January 5, 1985. AGENT: Thank you, Mr. Chen. Identity verified. Before I finalize the cancellation, we highly value your loyalty. I can offer an immediate 15% retention discount on your premium if you choose to stay. CUSTOMER: Oh, a 15% discount. In that case, let's keep the policy active. I'll accept that offer. AGENT: Wonderful. I will apply the discount right now and email you the updated policy documents. Have a great day."
}' -Encoding UTF8
```

### Step 2: Insert CallRecord

```powershell
uip df records insert beac40ee-bd6b-f111-8fcb-000d3ab36606 --file CallRecord_S1.json --output json
```

### Step 3: Get the inserted record's system Id

```powershell
uip df records query beac40ee-bd6b-f111-8fcb-000d3ab36606 --body '{"filterGroup":{"logicalOperator":0,"queryFilters":[{"fieldName":"callid","operator":"=","value":"S1_CALL_001"}]},"selectedFields":["Id"]}' --output json
```

### Step 4: (Optional) Insert CallFollowup

```powershell
Set-Content -Path "CallFollowup_S1.json" -Value '{
  "callid": "S1_CALL_001",
  "text": "Email updated policy documents to customer",
  "reason": "Agent committed to emailing updated policy documents after applying 15% retention discount",
  "source": 0,
  "status": 0
}' -Encoding UTF8

uip df records insert 993c2c06-be6b-f111-8fcb-000d3ab36606 --file CallFollowup_S1.json --output json
```

### Step 5: Update AiUsage Singleton

```powershell
# First query to get the record Id
uip df records query 45af032d-bb6b-f111-8fcb-000d3ab36606 --body '{"filterGroup":{"logicalOperator":0,"queryFilters":[{"fieldName":"record_key","operator":"=","value":"singleton"}]},"selectedFields":["Id"]}' --output json
```

Note the `Id` from output (e.g., `abc12345-...`)

```powershell
Set-Content -Path "AiUsageUpdate.json" -Value '{
  "period_date": "2026-06-19",
  "last_call_at": "2026-06-19T10:00:00",
  "last_model": "gemini-2.5-flash",
  "last_endpoint": "audio_analysis"
}' -Encoding UTF8

uip df records update 45af032d-bb6b-f111-8fcb-000d3ab36606 <Id-from-query> --file AiUsageUpdate.json --output json
```

**Note:** `calls_today` and `total_calls` are INTEGER and cannot be updated via `--file`. Update those via Studio Web UI.

---

## 3. Schema Updates Applied (2026-06-22)

**Status:** ✅ All 16 fields were successfully added via `uip df entities update`.

**First batch (15 JSON fields):**

```powershell
Set-Content -Path "CallRecord_AddFields.json" -Value '{
  "addFields": [
    {"fieldName": "duration_seconds", "type": "DECIMAL"},
    {"fieldName": "agent_sentiment", "type": "DECIMAL"},
    {"fieldName": "customer_sentiment", "type": "DECIMAL"},
    {"fieldName": "agent_audio_emotion", "type": "STRING", "lengthLimit": 20},
    {"fieldName": "customer_audio_emotion", "type": "STRING", "lengthLimit": 20},
    {"fieldName": "agent_talk_pct", "type": "DECIMAL"},
    {"fieldName": "customer_talk_pct", "type": "DECIMAL"},
    {"fieldName": "fraud_risk", "type": "STRING", "lengthLimit": 20},
    {"fieldName": "fraud_reason", "type": "MULTILINE_TEXT", "lengthLimit": 2000},
    {"fieldName": "pii_digits_detected", "type": "CHOICE_SET_SINGLE", "choiceSetId": "1f70450b-ba6b-f111-8fcb-000d3ab36606"},
    {"fieldName": "is_followup_call", "type": "CHOICE_SET_SINGLE", "choiceSetId": "1f70450b-ba6b-f111-8fcb-000d3ab36606"},
    {"fieldName": "followup_call_evidence", "type": "MULTILINE_TEXT", "lengthLimit": 2000},
    {"fieldName": "compliance_detail", "type": "MULTILINE_TEXT", "lengthLimit": 10000},
    {"fieldName": "compliance_fail_count", "type": "INTEGER"},
    {"fieldName": "trigger_count", "type": "INTEGER"}
  ]
}' -Encoding UTF8

uip df entities update beac40ee-bd6b-f111-8fcb-000d3ab36606 --file "CallRecord_AddFields.json" --output json
```

**Second batch (agent_id for metadata mapping):**

```powershell
Set-Content -Path "AddAgentId.json" -Value '{
  "addFields": [
    {"fieldName": "agent_id", "type": "STRING", "lengthLimit": 10}
  ]
}' -Encoding UTF8

uip df entities update beac40ee-bd6b-f111-8fcb-000d3ab36606 --file "AddAgentId.json" --output json
```

**Result:** `Code: EntityUpdated` — all 16 fields added successfully.

---

## 4. Full JSON with All Fields (Including call_metadata)

```powershell
Set-Content -Path "CallRecord_S1_Full.json" -Value '{
  "callid": "S1_9879_20260622",
  "call_date": "2026-06-22",
  "call_start_time": "2026-06-22T13:26:00",
  "call_end_time": "2026-06-22T13:27:30",
  "caller_name": "David Chen",
  "caller_nric": "S1234567D",
  "caller_dob": "1985-01-05",
  "caller_number": "9879879879",
  "agent_name": "Mike",
  "agent_id": "1001",
  "call_intent1": "Cancellations",
  "call_resolved_flag": 0,
  "compliance_flag": 1,
  "triggerword_flag": 1,
  "file_name": "9879879879_21-06-2026_13-23_To_14_30.mp3",
  "call_summary": "The caller initially wanted to cancel their insurance policy due to an increased premium but agreed to keep it after being offered a 15% retention discount.",
  "transcript": "AGENT: Welcome to Acme Insurance Renewals. My name is Mike...",
  "duration_seconds": 65.9,
  "agent_sentiment": 0.5,
  "customer_sentiment": -0.33,
  "agent_audio_emotion": "neutral",
  "customer_audio_emotion": "neutral",
  "agent_talk_pct": 59.6,
  "customer_talk_pct": 40.4,
  "fraud_risk": "low",
  "fraud_reason": "The caller accepted the discount and provided personal information as requested.",
  "pii_digits_detected": 0,
  "is_followup_call": 1,
  "followup_call_evidence": "None of the cues 'as I mentioned', 'last time', or 'called yesterday' are present...",
  "compliance_detail": "[{\"id\":\"purpose_disclosure\",\"status\":\"PASS\"...}]",
  "compliance_fail_count": 2,
  "trigger_count": 0
}' -Encoding UTF8
```

**Insert command:**
```powershell
uip df records insert beac40ee-bd6b-f111-8fcb-000d3ab36606 --file "CallRecord_S1_Full.json" --output json
```

**Result:** `Code: RecordInserted` — callid `S1_9879_20260622` inserted successfully.

---

## 5. Quick Reference: Which Entity Gets What

| JSON Section | Target Entity | Action | Condition |
|---|---|---|---|
| `recording`, `duration_sec` | CallRecord | Insert | Always |
| `summary` | CallRecord | Insert | Always |
| `intent` | CallRecord | Insert | Always |
| `resolution` | CallRecord | Insert | Always |
| `fraud_risk`, `fraud_reason` | CallRecord | Insert | Always |
| `is_followup`, `followup_evidence` | CallRecord | Insert | Always |
| `sentiment_avg` | CallRecord | Insert | Always |
| `talk_ratio_pct` | CallRecord | Insert | Always |
| `audio_emotion` | CallRecord | Insert | Always |
| `compliance` | CallRecord | Insert | Always |
| `compliance_violations` | CallRecord | Insert | Always |
| `pii_digits_detected` | CallRecord | Insert | Always |
| `triggers` | CallRecord | Insert | Always |
| `transcript` | CallRecord | Insert | Always |
| Follow-up items inferred | CallFollowup | Insert | Only if action items exist |
| Counters | AiUsage | Update | Every call |
