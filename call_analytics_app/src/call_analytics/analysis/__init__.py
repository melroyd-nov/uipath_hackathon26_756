"""LLM analysis stages: roles, sentiment, heatmap/triggers, compliance, follow-up, rollup."""
from .roles import assign_roles, detect_call_opening
from .sentiment import score_sentiment
from .heatmap import build_heatmap, detect_triggers
from .compliance import run_compliance
from .followup import detect_followup
from .followup_actions import generate_followup_actions
from .rollup import run_rollup

__all__ = ["assign_roles", "detect_call_opening", "score_sentiment", "build_heatmap",
           "detect_triggers", "run_compliance", "detect_followup",
           "generate_followup_actions", "run_rollup"]
