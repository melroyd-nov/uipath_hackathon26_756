"""In-call follow-up detection — does this call reference a prior interaction?"""
from __future__ import annotations

from ..llm import structured
from ..schemas import FollowUp
from ..settings import get_settings

def detect_followup(transcript: str) -> dict:
    s = get_settings()
    out = structured(FollowUp).invoke(
        s.prompt("followup_prompt").format(transcript=transcript[: s.max_transcript_chars])
    )
    return out.model_dump()
