"""Sentiment heatmap (PNG) + trigger detection (pure logic)."""
from __future__ import annotations

from collections import defaultdict

from ..settings import get_settings
from ..rubrics import ESCALATION_KEYWORDS


def build_heatmap(attributed_turns: list[dict], duration: float, out_path: str) -> str:
    """Render a per-speaker sentiment heatmap to `out_path`; returns the path."""
    import numpy as np
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt

    s = get_settings()
    W = s.heatmap_bin_sec
    T = max((a["end"] for a in attributed_turns), default=duration or 1.0)
    nb = int(T // W) + 1
    rowof = {"AGENT": 0, "CUSTOMER": 1}
    grid = np.full((2, nb), np.nan)
    acc = defaultdict(list)
    for a in attributed_turns:
        if a.get("role") in rowof and a.get("sentiment") is not None:
            acc[(rowof[a["role"]], int(a["start"] // W))].append(a["sentiment"])
    for (r, b), vals in acc.items():
        grid[r, b] = float(np.mean(vals))

    fig, ax = plt.subplots(figsize=(13, 2.6))
    im = ax.imshow(grid, aspect="auto", cmap="RdYlGn", vmin=-2, vmax=2)
    ax.set_yticks([0, 1]); ax.set_yticklabels(["AGENT", "CUSTOMER"])
    ax.set_xlabel(f"time ({W}s bins)  →  {T:.0f}s")
    ax.set_title("Sentiment heatmap (red = negative, green = positive)")
    fig.colorbar(im, ax=ax, label="avg sentiment (-2..+2)", fraction=0.025)
    fig.tight_layout()
    fig.savefig(out_path, dpi=120)
    plt.close(fig)
    return out_path


def detect_triggers(attributed_turns: list[dict]) -> list[dict]:
    """Flag escalation moments in the call.

    Two complementary signals:
      * ``sentiment_drop``  — a sharp negative shift in the customer's sentiment, paired with
        the agent turn that likely caused it.
      * ``escalation_language`` — a customer turn that contains regulatory / legal / public-
        shaming threats (lawyer, MAS, social media, "fourth time calling", …), which a
        supervisor wants surfaced even when the sentiment delta alone doesn't cross the bar.
    """
    s = get_settings()
    cust = [a for a in attributed_turns
            if a.get("role") == "CUSTOMER" and a.get("sentiment") is not None]
    triggers = []
    for prev, curr in zip(cust, cust[1:]):
        if curr["sentiment"] - prev["sentiment"] <= -s.trigger_drop:
            trig = max(
                (a for a in attributed_turns
                 if a.get("role") == "AGENT" and a["start"] < curr["start"]),
                key=lambda a: a["start"], default=None,
            )
            triggers.append({
                "type": "sentiment_drop",
                "time": round(curr["start"], 1),
                "from": prev["sentiment"], "to": curr["sentiment"],
                "customer_text": curr["text"][:80],
                "trigger_time": round(trig["start"], 1) if trig else None,
                "trigger_agent_text": trig["text"][:80] if trig else None,
            })

    for a in attributed_turns:
        if a.get("role") != "CUSTOMER":
            continue
        low = a["text"].lower()
        hits = [k for k in ESCALATION_KEYWORDS if k in low]
        if hits:
            triggers.append({
                "type": "escalation_language",
                "time": round(a["start"], 1),
                "keywords": hits,
                "customer_text": a["text"][:120],
            })

    triggers.sort(key=lambda t: t["time"])
    return triggers
