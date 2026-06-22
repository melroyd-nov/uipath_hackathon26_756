"""Top-level entrypoint: analyze_call(audio_path) -> CallReport (compiles + invokes the graph)."""
from __future__ import annotations

from functools import lru_cache

from .schemas import CallReport


@lru_cache(maxsize=1)
def _graph():
    from .graph import build_graph
    return build_graph()


def analyze_call(audio_path, **invoke_kwargs) -> CallReport:
    """Run the full analytics pipeline on one audio file and return a CallReport."""
    final = _graph().invoke({"audio_path": str(audio_path)}, **invoke_kwargs)
    return CallReport(**final["report"])
