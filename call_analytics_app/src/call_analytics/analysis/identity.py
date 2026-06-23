"""Extract caller identity fields (NRIC, DOB, policy number) stated during a call.

These are not in the friend's pre-computed analysis JSON; a caller speaks them aloud during
identity verification, so they must be pulled from the transcript. They are sensitive PII, so
every value is MASKED before it ever reaches the report — the raw value is never persisted:

  * NRIC / policy number -> first char + last 4 visible, middle bulleted (e.g. ``S••••567A``)
  * DOB                  -> reduced to its 4-digit year only (e.g. ``1985``)

Anything not stated (or too short to mask without leaking) becomes the literal ``"NA"`` so the
downstream BPMN process always sees a non-null string. The prompt is proprietary (loaded from
.env).
"""
from __future__ import annotations

import re

from ..llm import structured
from ..schemas import CallerIdentity
from ..settings import get_settings

_NA = "NA"
_BLANK = {"", "NA", "N/A", "NONE", "UNKNOWN", "NOT STATED", "NOT PROVIDED"}


def _is_blank(v: str | None) -> bool:
    return not v or v.strip().upper() in _BLANK


def _mask_tail(value: str, visible: int = 4) -> str:
    """Keep the first + last ``visible`` alphanumerics, bullet the middle. NA if too short."""
    chars = [c for c in value if c.isalnum()]
    if len(chars) <= visible + 1:
        return _NA  # too short to mask without revealing essentially the whole value
    head, tail = chars[0], "".join(chars[-visible:])
    return f"{head}{'•' * (len(chars) - visible - 1)}{tail}"


def _year_only(value: str) -> str:
    """Reduce a DOB to its 4-digit year — the most we expose. e.g. '12 Mar 1985' -> '1985'."""
    m = re.search(r"\b(19|20)\d{2}\b", value)
    return m.group(0) if m else _NA


def extract_identity(transcript: str) -> dict:
    """Return masked caller identifiers: ``{caller_nric, caller_dob, policy_number}``."""
    s = get_settings()
    out = structured(CallerIdentity, judge=True).invoke(
        s.prompt("identity_prompt").format(transcript=transcript[: s.max_transcript_chars])
    )
    return {
        "caller_nric": _NA if _is_blank(out.nric) else _mask_tail(out.nric, visible=4),
        "caller_dob": _NA if _is_blank(out.dob) else _year_only(out.dob),
        "policy_number": _NA if _is_blank(out.policy_number) else _mask_tail(out.policy_number, visible=4),
    }
