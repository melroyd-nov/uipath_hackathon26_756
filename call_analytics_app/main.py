"""Cloud LangGraph: orchestrates the call-analytics pipeline ON the local server,
one step at a time, so each step (transcribe, diarize, …) is its own Orchestrator
trace span with its output captured as JSON.

The heavy ML and the proprietary prompts stay local. This graph never sees the
audio waveform or intermediate state — it holds a `session_id` and drives the
local server's per-step API by reference; each call returns only that step's
compact JSON, which lands in the trace. Bucket I/O (download in, report out)
brackets the run.
"""
from __future__ import annotations
import json
import os
import tempfile
from typing import Any, TypedDict

import httpx
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, START, END

# Bucket names — overridable per environment via Orchestrator bindings
INPUT_BUCKET = "call-analytics-audio"
OUTPUT_BUCKET = "call-analytics-results"

# Pipeline steps run on the local server, in order. Each becomes a graph node and
# therefore a trace span. Mirrors call_analytics.graph.build_graph()'s order.
STEPS = [
    "load_audio", "transcribe", "diarize", "align", "roles", "sentiment",
    "emotion", "compliance", "followup", "rollup", "followup_actions", "identity",
]

_STEP_TIMEOUT = 600.0  # a single GPU step (e.g. transcribe) can take a minute+


class AgentState(TypedDict, total=False):
    audio_blob_path: str
    api_url: str
    api_key: str
    audio_local_path: str
    session_id: str
    steps: dict          # per-step JSON projections, accumulated for output/trace
    report: dict
    artifacts: dict


class GraphInput(BaseModel):
    audio_blob_path: str = Field(
        description="Path to the audio file inside the input bucket (e.g. 'calls/recording.wav')"
    )
    api_url: str = Field(
        description="Base URL of your local analytics server (e.g. 'https://xxxx.ngrok-free.app')"
    )
    api_key: str = Field(
        default="",
        description="Shared secret for the local server's X-API-Key header (optional)",
    )


class GraphOutput(BaseModel):
    report: dict = Field(description="Full CallReport as a dictionary")
    steps: dict = Field(
        default_factory=dict,
        description="Per-step JSON outputs (transcription, diarization, …)",
    )
    artifacts: dict = Field(
        default_factory=dict,
        description="Bucket paths of uploaded output artifacts",
    )


# --- credential seam ------------------------------------------------------------
# SEAM: the work-laptop deployment sources the local server's URL + API key from
# Orchestrator assets / a connection. Keep that wiring HERE, in this one function,
# so it is re-applied in exactly one place and never clobbered by the per-step
# refactor. Default below just reads them off the graph input.
def _local_api(state: AgentState) -> tuple[str, dict[str, str]]:
    base_url = state["api_url"].rstrip("/")
    headers: dict[str, str] = {}
    if state.get("api_key"):
        headers["X-API-Key"] = state["api_key"]
    return base_url, headers


def _delete_session(state: AgentState) -> None:
    """Best-effort session cleanup so a failed run doesn't leak server state."""
    sid = state.get("session_id")
    if not sid:
        return
    base_url, headers = _local_api(state)
    try:
        httpx.delete(f"{base_url}/sessions/{sid}", headers=headers, timeout=30.0)
    except Exception:
        pass


def n_fetch_audio(state: AgentState) -> dict:
    from uipath.platform import UiPath

    ext = os.path.splitext(state["audio_blob_path"])[1] or ".wav"
    tmp = tempfile.mktemp(suffix=ext)
    sdk = UiPath()
    sdk.buckets.download(
        name=INPUT_BUCKET,
        blob_file_path=state["audio_blob_path"],
        destination_path=tmp,
    )
    return {"audio_local_path": tmp}


def n_create_session(state: AgentState) -> dict:
    base_url, headers = _local_api(state)
    local_path = state["audio_local_path"]
    filename = os.path.basename(local_path)
    with open(local_path, "rb") as f:
        audio_bytes = f.read()
    try:
        resp = httpx.post(
            f"{base_url}/sessions",
            files={"file": (filename, audio_bytes)},
            headers=headers,
            timeout=_STEP_TIMEOUT,
        )
        resp.raise_for_status()
    finally:
        try:
            os.remove(local_path)
        except OSError:
            pass
    return {"session_id": resp.json()["session_id"], "steps": {}}


def _make_step_node(step: str):
    """Build a graph node that runs one pipeline step on the local server and
    records its JSON output. Each node = one trace span."""

    def _node(state: AgentState) -> dict:
        base_url, headers = _local_api(state)
        sid = state["session_id"]
        try:
            resp = httpx.post(
                f"{base_url}/sessions/{sid}/steps/{step}",
                headers=headers,
                timeout=_STEP_TIMEOUT,
            )
            resp.raise_for_status()
        except Exception:
            _delete_session(state)
            raise
        data = resp.json()
        # Accumulate into `steps` so the node's delta shows this step's output and
        # the final output carries every step. Read-merge: plain TypedDict has no reducer.
        return {"steps": {**state.get("steps", {}), step: data}}

    _node.__name__ = f"n_{step}"
    return _node


def n_finalize(state: AgentState) -> dict:
    base_url, headers = _local_api(state)
    sid = state["session_id"]
    try:
        resp = httpx.post(
            f"{base_url}/sessions/{sid}/finalize", headers=headers, timeout=_STEP_TIMEOUT
        )
        resp.raise_for_status()
    except Exception:
        _delete_session(state)
        raise
    report: dict = resp.json()
    # Local artifact paths are meaningless in the cloud context — scrub them.
    report["artifacts"] = {}
    return {"report": report}


def n_push_outputs(state: AgentState) -> dict:
    from uipath.platform import UiPath

    sdk = UiPath()
    audio_stem = os.path.splitext(os.path.basename(state["audio_blob_path"]))[0]
    report = dict(state.get("report", {}))

    report_blob = f"call-analytics/{audio_stem}/call_{audio_stem}.json"
    sdk.buckets.upload(
        name=OUTPUT_BUCKET,
        blob_file_path=report_blob,
        content=json.dumps(report, indent=2, ensure_ascii=False).encode(),
        content_type="application/json",
    )

    artifacts = {"report_json": f"bucket://{OUTPUT_BUCKET}/{report_blob}"}
    report["artifacts"] = artifacts
    return {"report": report, "artifacts": artifacts}


_builder = StateGraph(AgentState, input_schema=GraphInput, output_schema=GraphOutput)
_builder.add_node("fetch_audio", n_fetch_audio)
_builder.add_node("create_session", n_create_session)
for _step in STEPS:
    _builder.add_node(_step, _make_step_node(_step))
_builder.add_node("finalize", n_finalize)
_builder.add_node("push_outputs", n_push_outputs)

# Linear wiring: fetch -> create_session -> <12 steps> -> finalize -> push_outputs
_chain = ["fetch_audio", "create_session", *STEPS, "finalize", "push_outputs"]
_builder.add_edge(START, _chain[0])
for _a, _b in zip(_chain, _chain[1:]):
    _builder.add_edge(_a, _b)
_builder.add_edge(_chain[-1], END)

graph = _builder.compile()
