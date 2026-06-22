from __future__ import annotations
import json
import os
import tempfile
from typing import TypedDict

from pydantic import BaseModel, Field
from langgraph.graph import StateGraph, START, END

# Bucket names — overridable per environment via Orchestrator bindings
INPUT_BUCKET = "call-analytics-audio"
OUTPUT_BUCKET = "call-analytics-results"


class AgentState(TypedDict, total=False):
    audio_blob_path: str
    api_url: str
    audio_local_path: str
    report: dict
    artifacts: dict


class GraphInput(BaseModel):
    audio_blob_path: str = Field(
        description="Path to the audio file inside the input bucket (e.g. 'calls/recording.wav')"
    )
    api_url: str = Field(
        description="Base URL of your local analytics server (e.g. 'https://xxxx.ngrok-free.app')"
    )


class GraphOutput(BaseModel):
    report: dict = Field(description="Full CallReport as a dictionary")
    artifacts: dict = Field(
        default_factory=dict,
        description="Bucket paths of uploaded output artifacts",
    )


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


def n_call_local_api(state: AgentState) -> dict:
    import httpx

    local_path = state["audio_local_path"]
    api_url = state["api_url"].rstrip("/")
    filename = os.path.basename(local_path)

    with open(local_path, "rb") as f:
        audio_bytes = f.read()

    resp = httpx.post(
        f"{api_url}/analyze",
        files={"file": (filename, audio_bytes)},
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
_builder.add_node("call_local_api", n_call_local_api)
_builder.add_node("push_outputs", n_push_outputs)
_builder.add_edge(START, "fetch_audio")
_builder.add_edge("fetch_audio", "call_local_api")
_builder.add_edge("call_local_api", "push_outputs")
_builder.add_edge("push_outputs", END)

graph = _builder.compile()
