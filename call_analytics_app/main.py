"""Cloud LangGraph: orchestrates the call-analytics pipeline ON the local server,
one step at a time, so each step (transcribe, diarize, …) is its own Orchestrator
trace span with its output captured as JSON.

The heavy ML and the proprietary prompts stay on the local server. This graph never
sees the audio waveform or intermediate state — it downloads the audio from Google
Drive, opens a session on the local server, then drives the per-step API by
reference; each call returns only that step's compact JSON, which lands in the
trace. Audio (and optional metadata) come from Drive; the report is uploaded to a
bucket.
"""
from __future__ import annotations
import json
import os
import tempfile
from typing import TypedDict

import httpx
from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, START, END
from langgraph.types import RetryPolicy

# Bucket the report JSON is uploaded to — overridable per environment via bindings.
OUTPUT_BUCKET = "call-analytics-results"

# Secret asset holding the local server's X-API-Key — resolved at runtime, never
# baked into the package. Overridable per environment via Orchestrator bindings.
API_KEY_ASSET = "call-analytics-api-key"

# Text asset holding the local server base URL (the current ngrok URL). The URL
# always comes from this asset — update it in Orchestrator on each ngrok restart.
API_URL_ASSET = "call-analytics-api-url"

# Text asset holding the Google Drive IS connection ID (UUID). The agent uses it
# to fetch a Drive access token at runtime — configurable in Orchestrator, never
# baked into the package.
GDRIVE_CONN_ID_ASSET = "call-analytics-gdrive-conn-id"

# Pipeline steps run on the local server, in order. Each becomes a graph node and
# therefore a trace span. Mirrors the local call_analytics.graph node order.
STEPS = [
    "load_audio", "transcribe", "diarize", "align", "roles", "sentiment",
    "emotion", "compliance", "followup", "rollup", "followup_actions", "identity",
]

_STEP_TIMEOUT = 600.0  # a single GPU step (e.g. transcribe) can take a minute+


# --- per-step retry (in-agent, so a transient blip costs 1 agent run, not N) ----
# Under load (e.g. 4 parallel instances queueing on the single GPU) the ngrok hop
# occasionally drops a connection or times out mid-step. LangGraph retries the
# FAILING NODE in-process — same agent run, same session — so we don't re-bill the
# whole agent. Only transient failures retry; permanent ones (4xx) fail fast.
def _is_transient(exc: Exception) -> bool:
    # httpx.TransportError covers connect/read/write/timeout/protocol errors
    # (dropped tunnel, server busy). HTTPStatusError: retry only 429 / 5xx.
    if isinstance(exc, httpx.HTTPStatusError):
        return exc.response.status_code == 429 or exc.response.status_code >= 500
    return isinstance(exc, httpx.TransportError)


# max_attempts counts the first try, so 4 = 1 initial attempt + up to 3 retries.
_RETRY = RetryPolicy(
    max_attempts=4,
    initial_interval=1.0,
    backoff_factor=2.0,
    max_interval=30.0,
    jitter=True,
    retry_on=_is_transient,
)


class AgentState(TypedDict, total=False):
    file_id: str
    file_name: str
    metadata_file_id: str
    audio_local_path: str
    call_metadata: dict
    api_url: str            # resolved once from the text asset (NOT secret)
    session_id: str
    steps: dict             # per-step JSON projections, accumulated for output/trace
    report: dict
    artifacts: dict


class GraphInput(BaseModel):
    file_id: str = Field(
        description="Google Drive file ID of the audio file to analyze (from the Drive trigger item)."
    )
    file_name: str | None = Field(
        default=None,
        description="Original file name (with extension). Optional — used for naming the output report.",
    )
    metadata_file_id: str | None = Field(
        default=None,
        description="Google Drive file ID of the call's metadata JSON (from the 'Audio_Metadata' folder). Optional — merged into the final report.",
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
# api_url (the local server base URL) comes from a Text asset; the X-API-Key from a
# Secret asset. The URL is resolved once and carried in state (non-secret, fine to
# trace); the secret is fetched fresh per HTTP call and NEVER stored in graph state
# (so it can't leak into the trace).
def _resolve_url() -> str:
    from uipath.platform import UiPath

    sdk = UiPath()
    url_asset = sdk.assets.retrieve(name=API_URL_ASSET)
    api_url = url_asset.value or url_asset.string_value
    if not api_url:
        raise ValueError(
            "The 'call-analytics-api-url' asset is empty — set it to the current server URL."
        )
    return api_url.rstrip("/")


def _headers() -> dict[str, str]:
    from uipath.platform import UiPath

    sdk = UiPath()
    api_key = sdk.assets.retrieve_secret(name=API_KEY_ASSET)
    return {"X-API-Key": api_key} if api_key else {}


# NOTE: no eager session-delete on failure. With per-node retry, the session must
# survive a failed attempt so the retry can resume it. A session abandoned after
# retries are exhausted is reaped by the local server's idle TTL sweep.


def _parse_metadata(data: bytes) -> dict:
    """Parse the call-metadata file into a dict.

    Prefers strict JSON; falls back to a lenient ``key : value`` line parser for
    the loosely-formatted files the upstream currently produces (unquoted keys/
    values, no commas). Values are kept as strings (phone numbers / IDs must not
    be coerced to ints). Returns ``{"raw": <text>}`` only if nothing parses.
    """
    text = data.decode("utf-8", errors="replace")
    try:
        parsed = json.loads(text)
        if isinstance(parsed, dict):
            return parsed
    except ValueError:
        pass

    result: dict = {}
    for line in text.splitlines():
        line = line.strip().strip(",").strip()
        if not line or line in ("{", "}"):
            continue
        key, sep, value = line.partition(":")  # split on first colon only
        if not sep:
            continue
        key = key.strip().strip('"').strip()
        value = value.strip().strip('"').strip()
        if key:
            result[key] = value
    return result or {"raw": text}


def _drive_download(file_id: str, access_token: str) -> bytes:
    """Fetch a Google Drive file's raw bytes via the Drive API."""
    resp = httpx.get(
        f"https://www.googleapis.com/drive/v3/files/{file_id}",
        params={"alt": "media"},
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=300.0,
    )
    resp.raise_for_status()
    return resp.content


def n_download_file(state: AgentState) -> dict:
    """Download the audio (and optional metadata JSON) from Google Drive."""
    from uipath.platform import UiPath
    from uipath.platform.connections import ConnectionTokenType

    sdk = UiPath()
    # Connection ID comes from a Text asset; fetch a Google OAuth token for it.
    conn_asset = sdk.assets.retrieve(name=GDRIVE_CONN_ID_ASSET)
    conn_id = conn_asset.value or conn_asset.string_value
    if not conn_id:
        raise ValueError(
            "The 'call-analytics-gdrive-conn-id' asset is empty — set it to the Drive connection ID."
        )
    access_token = sdk.connections.retrieve_token(
        conn_id, ConnectionTokenType.DIRECT
    ).access_token

    # 1) Audio file → temp file
    audio_bytes = _drive_download(state["file_id"], access_token)
    name = state.get("file_name") or "audio_input"
    ext = os.path.splitext(name)[1] or ".wav"
    tmp = tempfile.mktemp(suffix=ext)
    with open(tmp, "wb") as f:
        f.write(audio_bytes)
    out: dict = {"audio_local_path": tmp}

    # 2) Optional metadata JSON → parsed dict (raw text fallback if not valid JSON)
    metadata_file_id = state.get("metadata_file_id")
    if metadata_file_id:
        meta_bytes = _drive_download(metadata_file_id, access_token)
        out["call_metadata"] = _parse_metadata(meta_bytes)

    return out


def n_create_session(state: AgentState) -> dict:
    """Upload the audio to the local server once and open a per-step session."""
    base_url = _resolve_url()
    local_path = state["audio_local_path"]
    filename = state.get("file_name") or os.path.basename(local_path)
    with open(local_path, "rb") as f:
        audio_bytes = f.read()
    try:
        resp = httpx.post(
            f"{base_url}/sessions",
            files={"file": (filename, audio_bytes)},
            headers=_headers(),
            timeout=_STEP_TIMEOUT,
        )
        resp.raise_for_status()
    finally:
        try:
            os.remove(local_path)
        except OSError:
            pass
    return {"api_url": base_url, "session_id": resp.json()["session_id"], "steps": {}}


def _make_step_node(step: str):
    """Build a graph node that runs one pipeline step on the local server and
    records its JSON output. Each node = one trace span."""

    def _node(state: AgentState) -> dict:
        base_url = state["api_url"]
        sid = state["session_id"]
        # On a transient failure this raises; the node's RetryPolicy re-runs it
        # (same session) up to the retry limit.
        resp = httpx.post(
            f"{base_url}/sessions/{sid}/steps/{step}",
            headers=_headers(),
            timeout=_STEP_TIMEOUT,
        )
        resp.raise_for_status()
        data = resp.json()
        # Accumulate into `steps` so the node's delta shows this step's output and
        # the final output carries every step. Read-merge: plain TypedDict has no reducer.
        return {"steps": {**state.get("steps", {}), step: data}}

    _node.__name__ = f"n_{step}"
    return _node


def n_finalize(state: AgentState) -> dict:
    base_url = state["api_url"]
    sid = state["session_id"]
    resp = httpx.post(
        f"{base_url}/sessions/{sid}/finalize", headers=_headers(), timeout=_STEP_TIMEOUT
    )
    resp.raise_for_status()
    report: dict = resp.json()
    # Local artifact paths are meaningless in the cloud context — scrub them.
    report["artifacts"] = {}
    return {"report": report}


def n_push_outputs(state: AgentState) -> dict:
    from uipath.platform import UiPath

    sdk = UiPath()
    stem_src = state.get("file_name") or state["file_id"]
    audio_stem = os.path.splitext(os.path.basename(stem_src))[0]
    report = dict(state.get("report", {}))

    # Fold the call metadata (caller/agent/timestamps) into the final report.
    call_metadata = state.get("call_metadata")
    if call_metadata:
        report["call_metadata"] = call_metadata

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


# Every node gets the same in-agent retry policy: a transient blip retries the
# single node, not the whole agent (keeps billed agent runs at 1).
_builder = StateGraph(AgentState, input_schema=GraphInput, output_schema=GraphOutput)
_builder.add_node("download_file", n_download_file, retry_policy=_RETRY)
_builder.add_node("create_session", n_create_session, retry_policy=_RETRY)
for _step in STEPS:
    _builder.add_node(_step, _make_step_node(_step), retry_policy=_RETRY)
_builder.add_node("finalize", n_finalize, retry_policy=_RETRY)
_builder.add_node("push_outputs", n_push_outputs, retry_policy=_RETRY)

# Linear wiring: download_file -> create_session -> <12 steps> -> finalize -> push_outputs
_chain = ["download_file", "create_session", *STEPS, "finalize", "push_outputs"]
_builder.add_edge(START, _chain[0])
for _a, _b in zip(_chain, _chain[1:]):
    _builder.add_edge(_a, _b)
_builder.add_edge(_chain[-1], END)

graph = _builder.compile()
