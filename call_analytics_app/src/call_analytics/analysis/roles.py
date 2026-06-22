"""Assign AGENT / CUSTOMER to the anonymous diarization labels via the LLM.

Robust: the LLM's answer is validated against the real speaker labels. If it returns labels
that don't exist (small models sometimes do), we fall back to a deterministic order so that
downstream stages (talk-ratio, per-role sentiment) always get a valid AGENT/CUSTOMER mapping.
"""
from __future__ import annotations

from ..llm import structured
from ..schemas import RoleAssignment
from ..rubrics import AGENT_CUES, CUSTOMER_CUES
from ..settings import get_settings


def _agent_score(text: str) -> int:
    """How agent-like a speaker's combined text is (agent cues minus customer cues)."""
    t = text.lower()
    return sum(c in t for c in AGENT_CUES) - sum(c in t for c in CUSTOMER_CUES)


def _lexical_roles(attributed_turns: list[dict]) -> tuple[dict[str, int], str | None]:
    """Per-speaker agent-score and the most agent-like speaker (or None if tied/empty)."""
    by_spk: dict[str, list[str]] = {}
    for a in attributed_turns:
        by_spk.setdefault(a["speaker"], []).append(a["text"])
    scores = {spk: _agent_score(" ".join(txt)) for spk, txt in by_spk.items()}
    if not scores:
        return scores, None
    top = max(scores, key=scores.get)
    runner = sorted(scores.values(), reverse=True)
    # Only treat it as a confident signal when there's a clear leader.
    if len(runner) > 1 and runner[0] == runner[1]:
        return scores, None
    return scores, top


def detect_call_opening(attributed_turns: list[dict]) -> bool:
    """True if the segment appears to contain the call opening (agent greeting / self-id)."""
    agent_turns = [a for a in attributed_turns if a.get("role") == "AGENT"]
    head = agent_turns[:2] or attributed_turns[:2]
    text = " ".join(a["text"].lower() for a in head)
    opening_cues = ("speaking", "how can i help", "how may i", "thank you for calling",
                    "welcome to", "you are speaking with", "good morning", "good afternoon")
    return any(c in text for c in opening_cues)


def _fallback(speakers: list[str], attributed_turns: list[dict]) -> dict[str, str]:
    """Deterministic fallback when the LLM labels are unusable.

    Prefer the lexical agent signal; only fall back to speaking order (caller usually greets
    first) when the words give no clear lead.
    """
    if len(speakers) < 2:
        return {s: s for s in speakers}
    _, lex_agent = _lexical_roles(attributed_turns)
    if lex_agent is not None:
        roles = {lex_agent: "AGENT"}
        others = sorted(s for s in speakers if s != lex_agent)
        roles[others[0]] = "CUSTOMER"
        for extra in others[1:]:
            roles[extra] = "OTHER"
        return roles
    first_seen: dict[str, float] = {}
    for a in attributed_turns:
        first_seen.setdefault(a["speaker"], a["start"])
    ordered = sorted(speakers, key=lambda s: first_seen.get(s, float("inf")))
    roles = {ordered[0]: "CUSTOMER", ordered[1]: "AGENT"}   # caller usually greets first
    for extra in ordered[2:]:
        roles[extra] = "OTHER"
    return roles


def assign_roles(attributed_turns: list[dict]) -> dict[str, str]:
    """Stamp each turn with a `role` and return the {speaker: role} map."""
    speakers = sorted({a["speaker"] for a in attributed_turns})
    snippet = "\n".join(f'{a["speaker"]}: {a["text"]}' for a in attributed_turns[:30])

    lex_scores, lex_agent = _lexical_roles(attributed_turns)

    try:
        out = structured(RoleAssignment).invoke(
            get_settings().prompt("role_prompt").format(
                labels=", ".join(speakers), snippet=snippet)
        )
        valid = set(speakers)
        if out.agent in valid and out.customer in valid and out.agent != out.customer:
            # Sanity check against the lexical signal: if the LLM names an agent that the
            # transcript strongly contradicts (a >=3 swing the other way), trust the words.
            # This catches the short-fragment role-swap (e.g. an angry CUSTOMER tagged AGENT).
            if (lex_agent is not None and lex_agent != out.agent
                    and lex_scores.get(out.agent, 0) - lex_scores.get(lex_agent, 0) <= -3):
                roles = {lex_agent: "AGENT"}
                others = sorted(s for s in valid if s != lex_agent)
                roles[others[0]] = "CUSTOMER"
                for extra in others[1:]:
                    roles[extra] = "OTHER"
            else:
                roles = {out.agent: "AGENT", out.customer: "CUSTOMER"}
                for extra in valid - {out.agent, out.customer}:
                    roles[extra] = "OTHER"
        else:
            roles = _fallback(speakers, attributed_turns)
    except Exception:
        roles = _fallback(speakers, attributed_turns)

    for a in attributed_turns:
        a["role"] = roles.get(a["speaker"], a["speaker"])
    return roles
