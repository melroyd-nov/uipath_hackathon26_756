"""Derived dashboard analytics (deterministic — no LLM).

These are the fields the dashboard needs that the raw analysis does not emit directly:
categorical sentiment, escalation flag, friction score, marketing-opportunity class, and
the follow-up priority + specialist owner. All are pure functions of the report so far, so
they live here (called from outputs.build_report) rather than in a graph node.

Mappings are keyed to the agent's 5-way intent vocabulary
(Cancellations / Grievances / Claims Status / Billing / New Business) and the Acme agent
specialisations (Sam=Claims/Grievances, John=Policy Services, David=Escalations/Quality,
Mike=New Business/Renewals, Mary=Billing/Amendments).
"""
from __future__ import annotations

# Decimal-sentiment → category thresholds (dashboard wants -1 / 0 / +1).
_POS_THRESHOLD = 0.2
_NEG_THRESHOLD = -0.2

# Intent → specialist who should own any follow-up. John (Policy Services) is the default.
INTENT_TO_SPECIALIST: dict[str, str] = {
    "Claims Status": "Sam",
    "Grievances": "Sam",
    "Billing": "Mary",
    "New Business": "Mike",
    "Cancellations": "Mike",   # retention / renewals
}
_DEFAULT_SPECIALIST = "John"

# Intent → marketing opportunity class. "None" = pure service contact, no opportunity.
INTENT_TO_OPPORTUNITY: dict[str, str] = {
    "New Business": "Upsell",
    "Cancellations": "Retention",
    "Grievances": "Retention",     # win-back an at-risk customer
    "Billing": "Cross-sell",
    "Claims Status": "None",
}

# Friction composite weights (per the analysis doc §1.12).
_FRICTION_W_NEGATIVE = 0.40
_FRICTION_W_ESCALATION = 0.35
_FRICTION_W_REPEAT = 0.25


def categorize_sentiment(score: float | None) -> int | None:
    """Map a decimal sentiment (roughly -1..1) to -1 / 0 / +1; None passes through."""
    if score is None:
        return None
    if score > _POS_THRESHOLD:
        return 1
    if score < _NEG_THRESHOLD:
        return -1
    return 0


def derive_escalation(resolution: str | None, compliance_violations: list) -> bool:
    """Escalated if the call was left unresolved or any compliance rule failed (doc §1.7)."""
    return (resolution == "unresolved") or bool(compliance_violations)


def friction_score(*, is_negative: bool, is_escalated: bool, is_repeat: bool) -> float:
    """Per-call friction on a 0..100 scale (weighted negative / escalation / repeat)."""
    score = (
        _FRICTION_W_NEGATIVE * is_negative
        + _FRICTION_W_ESCALATION * is_escalated
        + _FRICTION_W_REPEAT * is_repeat
    )
    return round(100.0 * score, 1)


def marketing_opportunity(intent: str | None) -> str:
    """Marketing-opportunity class for the call's intent (Upsell/Cross-sell/Retention/...)."""
    return INTENT_TO_OPPORTUNITY.get(intent or "", "None")


def assign_specialist(intent: str | None) -> str:
    """Specialist who should own a follow-up for this intent."""
    return INTENT_TO_SPECIALIST.get(intent or "", _DEFAULT_SPECIALIST)


def followup_priority(*, escalation_flag: bool, fraud_risk: str | None,
                      compliance_violations: list, resolution: str | None,
                      customer_sentiment_cat: int | None) -> str:
    """high / medium / low, from escalation + compliance + fraud + resolution + sentiment."""
    if escalation_flag or fraud_risk == "high" or compliance_violations:
        return "high"
    if (resolution == "follow_up_needed" or fraud_risk == "medium"
            or customer_sentiment_cat == -1):
        return "medium"
    return "low"
