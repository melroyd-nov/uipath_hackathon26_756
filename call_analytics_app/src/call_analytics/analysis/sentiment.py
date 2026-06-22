"""Numeric per-turn sentiment (−2..+2).

One call per turn, run in parallel via LangChain `.batch()`. Per-turn (not a single batched
array) because small models drop/​mislabel items when asked to emit a long structured array —
the same finding that drove the per-rule compliance design.
"""
from __future__ import annotations

from ..llm import structured
from ..schemas import SentimentScore
from ..settings import get_settings

def score_sentiment(attributed_turns: list[dict]) -> list[int]:
    """Attach `sentiment` (−2..+2) to each turn; returns the score list."""
    s = get_settings()
    chain = structured(SentimentScore)
    sent_prompt = s.prompt("sent_prompt")

    idx, prompts = [], []
    for i, a in enumerate(attributed_turns):
        text = (a.get("text") or "").strip()
        a["sentiment"] = 0  # default (empty/blank turns)
        if text:
            idx.append(i)
            prompts.append(sent_prompt.format(text=text))

    if prompts:
        results = chain.batch(prompts, config={"max_concurrency": s.max_workers})
        for i, r in zip(idx, results):
            attributed_turns[i]["sentiment"] = max(-2, min(2, int(r.score)))

    return [a["sentiment"] for a in attributed_turns]
