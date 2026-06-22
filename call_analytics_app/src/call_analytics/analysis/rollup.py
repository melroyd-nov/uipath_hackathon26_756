"""Call-level rollup — summary, intent, resolution, fraud risk (single LLM call)."""
from __future__ import annotations

from ..llm import structured
from ..schemas import Rollup
from ..settings import get_settings

def run_rollup(transcript: str) -> dict:
    s = get_settings()
    out = structured(Rollup, judge=True).invoke(
        s.prompt("rollup_prompt").format(transcript=transcript[: s.max_transcript_chars])
    )
    return out.model_dump()
