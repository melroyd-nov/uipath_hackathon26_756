"""AI-generated supervisor follow-up action items (≤3) for a call.

Distinct from ``followup.py`` (which only detects whether a call *references* a prior
interaction). This proposes the concrete next steps a supervisor/agent should take, given
the call's intent and how it ended. The prompt is proprietary and loaded from .env.
"""
from __future__ import annotations

from ..llm import structured
from ..schemas import FollowupActions
from ..settings import get_settings


def generate_followup_actions(transcript: str, intent: str | None,
                              resolution: str | None) -> list[str]:
    """Return up to 3 concrete follow-up action items (may be empty)."""
    s = get_settings()
    out = structured(FollowupActions, judge=True).invoke(
        s.prompt("followup_actions_prompt").format(
            intent=intent or "unknown",
            resolution=resolution or "unknown",
            transcript=transcript[: s.max_transcript_chars],
        )
    )
    # Keep only non-empty, trimmed items; cap at 3.
    items = [i.strip() for i in out.action_items if i and i.strip()]
    return items[:3]
