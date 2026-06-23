"""Pydantic schemas: LLM structured-output models, data records, the public CallReport,
and the LangGraph CallState.
"""
from __future__ import annotations

from typing import Any, Literal, Optional, TypedDict
from pydantic import BaseModel, Field, model_validator

Status = Literal["PASS", "FAIL", "NA"]

# --------------------------------------------------------------------------------------
# LLM structured-output models (used with llm.with_structured_output(...))
# --------------------------------------------------------------------------------------

class RoleAssignment(BaseModel):
    agent: str = Field(description="the SPEAKER_xx label that is the support agent")
    customer: str = Field(description="the SPEAKER_xx label that is the customer")


class SentimentScore(BaseModel):
    score: int = Field(description="integer sentiment from -2 (very negative) to +2 (very positive), 0=neutral")


# NOTE: fields on these LLM-facing schemas are intentionally REQUIRED (no defaults).
# with_structured_output() omits default-valued fields from the `required` list, and
# constrained decoding then satisfies the schema with an empty `{}` — every field falls
# back to its default and the call silently produces nothing. Required fields force the
# model to actually generate each value. (Sentiment/Role schemas already had no defaults.)

class ComplianceVerdict(BaseModel):
    status: Status = Field(description="PASS if the rule is clearly satisfied, FAIL if clearly violated, NA if there is not enough evidence")
    evidence: str = Field(description="brief quoted evidence from the transcript supporting the status; empty string if none")
    reason: str = Field(description="one-line justification for the status")


class FollowUp(BaseModel):
    is_followup: bool = Field(description="true if this call references a prior interaction (previous call, ticket, earlier agent/request)")
    confidence: float = Field(description="confidence from 0.0 to 1.0")
    evidence: str = Field(description="brief evidence/quote for the decision; empty string if none")


class Rollup(BaseModel):
    summary: str = Field(description="concise 1-2 sentence summary of the call")
    intent: Literal["Cancellations", "Grievances", "Claims Status", "Billing", "New Business"] = Field(
        description="the single best-fit caller intent"
    )
    resolution: Literal["resolved", "unresolved", "follow_up_needed"] = Field(description="how the call ended")
    fraud_risk: Literal["low", "medium", "high"] = Field(description="fraud/scam risk level for this call")
    fraud_reason: str = Field(description="short reason for the fraud risk; empty string if low/none")


class FollowupActions(BaseModel):
    # Required (no default) so constrained decoding actually generates the list — see the
    # note above ComplianceVerdict. An empty list is valid when no follow-up is warranted.
    action_items: list[str] = Field(
        description="0 to 3 concrete next-step action items a supervisor/agent should take "
        "after this call (each a short imperative, e.g. 'Call the customer back to confirm "
        "the retention discount was applied'). Empty list if the call needs no follow-up."
    )


class CallerIdentity(BaseModel):
    # Caller identifiers spoken during verification (not in the raw analysis JSON). Required
    # (no defaults) so the model is forced to emit each — it returns the literal "NA" when a
    # value was never stated. Raw values are MASKED downstream before they reach the report.
    nric: str = Field(description="the caller's national ID / NRIC exactly as stated in the call, or 'NA' if never stated")
    dob: str = Field(description="the caller's date of birth exactly as stated in the call, or 'NA' if never stated")
    policy_number: str = Field(description="the insurance policy number exactly as stated in the call, or 'NA' if never stated")


# --------------------------------------------------------------------------------------
# Data records
# --------------------------------------------------------------------------------------

class Word(BaseModel):
    start: float
    end: float
    text: str


class DiarTurn(BaseModel):
    speaker: str
    start: float
    end: float


class AttributedTurn(BaseModel):
    speaker: str
    start: float
    end: float
    text: str
    role: Optional[str] = None        # AGENT | CUSTOMER (after role assignment)
    sentiment: Optional[int] = None   # -2..+2 (after sentiment scoring)


class SpeakerEmotion(BaseModel):
    speaker: str
    role: str
    talk_sec: float
    turns: int
    dominant: str
    distribution: dict[str, int] = Field(default_factory=dict)


class ComplianceItem(BaseModel):
    id: str
    rule: str
    status: Status
    evidence: str = ""
    reason: str = ""


# --------------------------------------------------------------------------------------
# Public output contract (mirrors notebook §10 call_<rec>.json) — UiPath Coded Agent I/O
# --------------------------------------------------------------------------------------

# String-valued report fields the BPMN consumer requires as non-null text (see validator below).
_NA_STRING_FIELDS = (
    "summary", "intent", "resolution", "fraud_risk", "fraud_reason", "followup_evidence",
    "marketing_opportunity", "followup_priority", "followup_assigned_to",
    "caller_nric", "caller_dob", "policy_number",
)


class CallReport(BaseModel):
    recording: str
    duration_sec: Optional[float] = None
    summary: Optional[str] = None
    intent: Optional[str] = None
    resolution: Optional[str] = None
    fraud_risk: Optional[str] = None
    fraud_reason: Optional[str] = None
    is_followup: Optional[bool] = None
    followup_evidence: Optional[str] = None
    sentiment_avg: dict[str, Optional[float]] = Field(default_factory=dict)
    talk_ratio_pct: dict[str, float] = Field(default_factory=dict)
    audio_emotion: dict[str, Optional[str]] = Field(default_factory=dict)
    compliance: list[ComplianceItem] = Field(default_factory=list)
    compliance_violations: list[str] = Field(default_factory=list)
    pii_digits_detected: Optional[bool] = None
    triggers: list[dict] = Field(default_factory=list)
    # Pipeline self-assessment: diarization health, opening presence, human-readable warnings.
    # Lets a reviewer tell "the call was clean" from "the analysis was degraded" at a glance.
    quality: dict[str, Any] = Field(default_factory=dict)
    # Role-labeled transcript for audit/debug: each turn's role, timing, text and sentiment.
    transcript: list[dict] = Field(default_factory=list)

    # --- Derived dashboard fields (computed by our agent; not in the raw analysis) ---
    # Categorical sentiment (-1/0/1) mapped from the decimal sentiment_avg, for the
    # dashboard's positive/neutral/negative counts.
    sentiment_category: Optional[int] = None
    sentiment_category_by_role: dict[str, Optional[int]] = Field(default_factory=dict)
    # Escalation: derived (unresolved OR any compliance violation).
    escalation_flag: Optional[bool] = None
    # Friction composite for this call (0..100): weighted negative/escalation/repeat.
    friction_score: Optional[float] = None
    # Marketing opportunity class derived from intent (Upsell/Cross-sell/Retention/Referral/None).
    marketing_opportunity: Optional[str] = None
    # AI-generated supervisor follow-up (action items + derived priority + specialist owner).
    followup_items: list[str] = Field(default_factory=list)
    followup_priority: Optional[str] = None
    followup_assigned_to: Optional[str] = None

    # --- Caller identity (extracted from transcript, MASKED) — sensitive PII ---
    # NRIC/policy masked to last 4 (e.g. S••••567A); DOB reduced to year. "NA" when not stated.
    caller_nric: str = "NA"
    caller_dob: str = "NA"
    policy_number: str = "NA"

    artifacts: dict[str, str] = Field(default_factory=dict)

    # The downstream BPMN process indexes report keys directly and breaks on a null where it
    # expects text. Every string-valued field must therefore be present AND non-null: coerce
    # any missing/blank string to the literal "NA". Numeric/bool/list/dict fields keep their
    # types (the key is always emitted by model_dump, so none are ever dropped).
    @model_validator(mode="after")
    def _na_for_missing_strings(self):
        for name in _NA_STRING_FIELDS:
            val = getattr(self, name, None)
            if val is None or (isinstance(val, str) and not val.strip()):
                setattr(self, name, "NA")
        return self


# --------------------------------------------------------------------------------------
# LangGraph state — mutable bag passed between nodes (total=False so nodes add keys)
# --------------------------------------------------------------------------------------

class CallState(TypedDict, total=False):
    audio_path: str
    audio: Any                 # np.ndarray (16kHz mono)
    sr: int
    duration_sec: float
    segments_text: str         # joined transcript
    words: list[dict]
    diar_turns: list[dict]
    speakers: list[str]
    attributed_turns: list[dict]
    roles: dict[str, str]
    speaker_emotion: list[dict]
    talk_time: dict[str, float]
    compliance: list[dict]
    pii_flag: bool
    followup: dict
    rollup: dict
    followup_actions: list[str]
    caller_identity: dict      # {caller_nric, caller_dob, policy_number} (masked)
    report: dict               # CallReport.model_dump()
    artifacts: dict[str, str]
