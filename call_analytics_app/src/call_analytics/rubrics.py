"""Compliance rubric ids + deterministic heuristics.

The rule TEXTS are proprietary and live in ``.env`` (loaded via settings); only the
ordered rule ids live here. Build the active rubric with ``get_settings().financial_rubric``.
"""
from __future__ import annotations

# Ordered compliance rule ids. Each rule's text comes from .env (RUBRIC_<ID>) and is
# judged independently (PASS / FAIL / NA) by the compliance node.
RULE_IDS: list[str] = [
    "purpose_disclosure",
    "recording_disclosure",
    "identity_verification",
    "no_guarantees",
    "no_sensitive_data_insecure",
    "no_remote_access",
    "no_fund_movement",
    "professional_conduct",
]

# Long digit runs spoken aloud (card/account/OTP) — deterministic PII backstop.
PII_DIGIT_PATTERN = r"\b(?:\d[ -]?){6,}\b"

# Rules that can only be judged if the start of the call is present in the segment.
# Self-identification, recording disclosure and identity verification all happen in the
# call opening; on a mid-call fragment there is no evidence either way, so forcing these to
# NA (instead of letting the judge guess FAIL) avoids systematic false violations.
CALL_LEVEL_RULES = {"purpose_disclosure", "recording_disclosure", "identity_verification"}

# Customer escalation / regulatory-threat language. Surfaced as triggers even when the
# sentiment delta alone doesn't cross the threshold — these are the lines a supervisor
# most wants flagged.
ESCALATION_KEYWORDS = [
    "lawyer", "sue", "legal action", "take you to court", "mas", "monetary authority",
    "regulator", "ombudsman", "formal complaint", "social media", "post about this",
    "every platform", "media", "news", "fourth time", "third time", "second time",
    "calling again", "calling back", "escalate", "cancel all", "compensation",
]

# Lexical cues for AGENT vs CUSTOMER, used to (a) detect the call opening and (b) sanity-check
# the LLM role assignment so a short fragment can't silently swap the two.
AGENT_CUES = [
    "how can i help", "how may i", "how may i assist", "thank you for calling",
    "welcome to", "acme insurance", "you are speaking with", "speaking", "this is",
    "may i have your", "may i please have", "for data protection", "for security",
    "identity verified", "i apologize", "i am sorry to hear", "let me pull up",
    "let me look into", "let me check", "i can help", "i can offer", "i can process",
    "i will process", "i will escalate", "i am escalating", "is there anything else",
    "reference", "i will send you", "i will email",
]
CUSTOMER_CUES = [
    "i want to cancel", "i need to cancel", "i want to", "i need to", "i am calling",
    "i'm calling", "i received", "my claim", "my policy", "my premium", "my account",
    "your team", "your company", "you charged me", "you deducted", "this is ridiculous",
    "this is unfair", "i am going to", "i'm going to", "nobody told me", "i was promised",
]
