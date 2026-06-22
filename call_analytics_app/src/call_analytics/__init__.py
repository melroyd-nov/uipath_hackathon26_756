"""Call-center audio analytics pipeline (LangGraph + LangChain).

Public surface:
    from call_analytics import analyze_call, CallReport
"""
from __future__ import annotations

from .schemas import CallReport

__all__ = ["analyze_call", "CallReport"]


def analyze_call(audio_path, **kwargs) -> CallReport:
    # Imported lazily so `import call_analytics` doesn't pull in torch/pyannote/etc.
    from .pipeline import analyze_call as _impl
    return _impl(audio_path, **kwargs)
