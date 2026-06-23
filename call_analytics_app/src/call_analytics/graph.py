"""LangGraph wiring: the call-analytics pipeline as a typed StateGraph.

Each node reads CallState and returns a partial update. Edges are linear today but the
structure leaves room for conditional branches later (skip diarize if mono, skip audio
stages if no GPU, etc.).
"""
from __future__ import annotations

from langgraph.graph import StateGraph, START, END

from .schemas import CallState
from . import audio as A
from . import analysis as AN
from . import outputs as O


def n_load_audio(state: CallState) -> dict:
    audio, sr, dur = A.load_audio(state["audio_path"])
    return {"audio": audio, "sr": sr, "duration_sec": dur}


def n_transcribe(state: CallState) -> dict:
    r = A.transcribe(state["audio"])
    return {"segments_text": r["text"], "words": r["words"], "duration_sec": r["duration"]}


def n_diarize(state: CallState) -> dict:
    turns, speakers = A.diarize(state["audio"], state["sr"])
    return {"diar_turns": turns, "speakers": speakers}


def n_align(state: CallState) -> dict:
    return {"attributed_turns": A.attribute(state["words"], state["diar_turns"])}


def n_roles(state: CallState) -> dict:
    at = state["attributed_turns"]
    roles = AN.assign_roles(at)          # stamps a["role"] in place
    return {"attributed_turns": at, "roles": roles}


def n_sentiment(state: CallState) -> dict:
    at = state["attributed_turns"]
    AN.score_sentiment(at)               # stamps a["sentiment"] in place
    return {"attributed_turns": at}


def n_emotion(state: CallState) -> dict:
    per, talk = A.speaker_emotion(
        state["audio"], state["sr"], state["diar_turns"], state["speakers"], state["roles"]
    )
    return {"speaker_emotion": per, "talk_time": talk}


def n_compliance(state: CallState) -> dict:
    at = state["attributed_turns"]
    roles = state.get("roles", {})
    roles_ok = "AGENT" in roles.values() and "CUSTOMER" in roles.values()
    # Call-level rules are only judgeable when the opening is in the segment AND roles resolved.
    opening_present = roles_ok and AN.detect_call_opening(at)
    transcript_roles = "\n".join(
        f'{a.get("role", a["speaker"])}: {a["text"]}' for a in at
    )
    results, pii_flag, _ = AN.run_compliance(transcript_roles, opening_present=opening_present)
    return {"compliance": results, "pii_flag": pii_flag}


def n_followup(state: CallState) -> dict:
    return {"followup": AN.detect_followup(state["segments_text"])}


def n_rollup(state: CallState) -> dict:
    return {"rollup": AN.run_rollup(state["segments_text"])}


def n_followup_actions(state: CallState) -> dict:
    # Needs the rollup (intent + resolution), so it runs after n_rollup.
    rollup = state.get("rollup", {})
    items = AN.generate_followup_actions(
        state["segments_text"], rollup.get("intent"), rollup.get("resolution")
    )
    return {"followup_actions": items}


def n_persist(state: CallState) -> dict:
    report = O.build_report(state)
    report = O.write_artifacts(state, report)
    return {"report": report.model_dump(), "artifacts": report.artifacts}


def build_graph():
    g = StateGraph(CallState)
    g.add_node("load_audio", n_load_audio)
    g.add_node("transcribe", n_transcribe)
    g.add_node("diarize", n_diarize)
    g.add_node("align", n_align)
    g.add_node("roles", n_roles)
    g.add_node("sentiment", n_sentiment)
    g.add_node("emotion", n_emotion)
    g.add_node("compliance", n_compliance)
    g.add_node("followup", n_followup)
    g.add_node("rollup", n_rollup)
    g.add_node("followup_actions", n_followup_actions)
    g.add_node("persist", n_persist)

    order = ["load_audio", "transcribe", "diarize", "align", "roles", "sentiment",
             "emotion", "compliance", "followup", "rollup", "followup_actions", "persist"]
    g.add_edge(START, order[0])
    for a, b in zip(order, order[1:]):
        g.add_edge(a, b)
    g.add_edge(order[-1], END)
    return g.compile()
