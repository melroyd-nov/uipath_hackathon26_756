from __future__ import annotations
import json
import os
import tempfile
from typing import TypedDict

from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, START, END

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


class AgentState(TypedDict, total=False):
    file_id: str
    file_name: str
    metadata_file_id: str
    audio_local_path: str
    call_metadata: dict
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
    artifacts: dict = Field(
        default_factory=dict,
        description="Bucket paths of uploaded output artifacts",
    )


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
    import httpx

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


def n_call_local_api(state: AgentState) -> dict:
    import httpx
    from uipath.platform import UiPath

    local_path = state["audio_local_path"]
    filename = state.get("file_name") or os.path.basename(local_path)

    sdk = UiPath()

    # Server URL always comes from the Text asset (update it on each ngrok restart).
    url_asset = sdk.assets.retrieve(name=API_URL_ASSET)
    api_url = url_asset.value or url_asset.string_value
    if not api_url:
        raise ValueError(
            "The 'call-analytics-api-url' asset is empty — set it to the current server URL."
        )
    api_url = api_url.rstrip("/")

    # Pull the server's API key from a UiPath Secret asset at runtime — keeps the
    # secret out of the deployed package.
    api_key = sdk.assets.retrieve_secret(name=API_KEY_ASSET)

    with open(local_path, "rb") as f:
        audio_bytes = f.read()

    resp = httpx.post(
        f"{api_url}/analyze",
        files={"file": (filename, audio_bytes)},
        headers={"X-API-Key": api_key},
        timeout=600.0,  # pipeline can take several minutes on GPU
    )
    resp.raise_for_status()
    report: dict = resp.json()

    try:
        os.remove(local_path)
    except OSError:
        pass

    # scrub local artifact paths — they're meaningless in the cloud context
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


_builder = StateGraph(AgentState, input_schema=GraphInput, output_schema=GraphOutput)
_builder.add_node("download_file", n_download_file)
_builder.add_node("call_local_api", n_call_local_api)
_builder.add_node("push_outputs", n_push_outputs)
_builder.add_edge(START, "download_file")
_builder.add_edge("download_file", "call_local_api")
_builder.add_edge("call_local_api", "push_outputs")
_builder.add_edge("push_outputs", END)

graph = _builder.compile()
